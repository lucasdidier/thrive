// Thrive Cloud billing (THRIVE_BILLING=paddle): a 7-day trial without a card, then a Paddle subscription.
// The trial lives in thrive_subscriptions; Paddle only sees people who subscribe. When the trial or the
// subscription ends, every signed-in API call answers 402 until the account subscribes again. Public
// client links (shared documents, forms, booking pages) keep working, so clients never hit a wall.
import {StoreError,loadWorkspace} from './store.mjs';
import {json,readBody,errorResponse} from './http.mjs';
import {adminClient,SupabaseDatabase} from './supabase-store.mjs';
import {adminEmail} from './beta.mjs';
import {appOrigin} from './auth.mjs';
import {sendOwnerNotification,disconnectNylas} from './nylas.mjs';
import {workspaceOwner} from './workspace-directory.mjs';
import {planAccess,trialEmailDue,trialEmail,priceLabel,yearlySaving,lockedSince,TRIAL_DAYS} from '../public/subscription-domain.js';
import {paddleRequest,verifyPaddleSignature,subscriptionSnapshot,paddlePlans} from './paddle.mjs';

const DAY=86400000;
const COLUMNS='owner_id,email,time_zone,trial_ends_at,trial_email,comped,paddle_customer_id,paddle_subscription_id,status,period_ends_at,cancel_at,price_id,event_at';
const OWNER=/^supabase:[0-9a-f-]{36}$/i;
const unavailable=()=>new StoreError('Account service unavailable. Please try again.',503);

export const billingEnabled=env=>env.THRIVE_BILLING==='paddle'&&env.THRIVE_AUTH_MODE==='supabase'&&env.THRIVE_DATA_BACKEND==='supabase';
export const trialDays=env=>{const n=Number(env.THRIVE_TRIAL_DAYS);return Number.isInteger(n)&&n>=1&&n<=60?n:TRIAL_DAYS;};
// The admin (THRIVE_ADMIN_EMAIL) always has access; anyone else gets it with comped = true.
const isAdmin=(env,email)=>!!adminEmail(env)&&String(email||'').toLowerCase()===adminEmail(env);

async function readRow(admin,owner){const {data,error}=await admin.from('thrive_subscriptions').select(COLUMNS).eq('owner_id',owner).maybeSingle();if(error)throw unavailable();return data;}
async function apply(admin,snapshot){const {data,error}=await admin.rpc('thrive_apply_subscription',{p:snapshot});if(error)throw unavailable();return data;}

// Open plans are cached per isolate for a minute: the workspace polls every few seconds. Locked plans are
// never cached, so a payment unlocks on the next request.
const cache=new Map();
export const forgetPlan=owner=>cache.delete(owner);
export async function accountPlan(env,user,{admin,now=new Date(),fresh=false}={}){
 const owner=user.owner,comped=isAdmin(env,user.email),hit=fresh?null:cache.get(owner);
 if(hit&&hit.until>now.getTime())return {row:hit.row,access:planAccess(hit.row,{now,comped})};
 admin??=adminClient(env);
 let row=await readRow(admin,owner);
 if(!row){
  // First visit: the trial starts now.
  const {error}=await admin.from('thrive_subscriptions').upsert({owner_id:owner,email:String(user.email||'').slice(0,254),trial_ends_at:new Date(now.getTime()+trialDays(env)*DAY).toISOString()},{onConflict:'owner_id',ignoreDuplicates:true});
  if(error)throw unavailable();
  row=await readRow(admin,owner);if(!row)throw unavailable();
 }
 const access=planAccess(row,{now,comped});
 if(!access.locked){cache.set(owner,{row,until:now.getTime()+60000});if(cache.size>2000)cache.delete(cache.keys().next().value);}
 return {row,access};
}

// Email & calendar (Nylas) cost Thrive money per connected account, so on Thrive Cloud they come with a paid
// plan: a trial can't connect one. Self-hosted installs (billing off) and free access are never limited.
export async function needsPaidPlan(env,user,options={}){
 if(!billingEnabled(env)||!user?.owner)return false;
 return (await accountPlan(env,user,options)).access.state==='trial';
}

export function lockedMessage(env,access){
 let origin='';try{origin=appOrigin(env);}catch{}
 return `${access.state==='ended'?'Your Thrive subscription has ended':'Your Thrive free trial has ended'}. Subscribe${origin?' at '+origin:''} to keep using Thrive.`;
}
// Called by withRuntime for every signed-in request except billing itself.
export async function requireAccess(env,user,options){
 if(!billingEnabled(env))return;
 const {access}=await accountPlan(env,user,options);
 if(access.locked)throw new StoreError(lockedMessage(env,access),402);
}

const validZone=tz=>{if(typeof tz!=='string'||!tz||tz.length>64)return false;try{new Intl.DateTimeFormat('en-US',{timeZone:tz});return true;}catch{return false;}};
async function planResponse(env,user,{admin,fetcher,now},extra={}){
 const {row,access}=await accountPlan(env,user,{admin,now}),{month,year}=await paddlePlans(env,{fetcher});
 const token=String(env.PADDLE_CLIENT_TOKEN||'');
 // price: what this account pays (its subscription's plan), else the monthly price. plans: what checkout offers.
 const current=year&&row.price_id===year.priceId?year:month;
 const plans=[month&&{id:'month',priceId:month.priceId,label:priceLabel(month.price),saving:0},year&&{id:'year',priceId:year.priceId,label:priceLabel(year.price),saving:yearlySaving(month?.price,year.price)}].filter(Boolean);
 return json({enabled:true,owner:user.owner,email:user.email||'',access,price:priceLabel(current?.price),interval:row.paddle_subscription_id&&current?(current===year?'year':'month'):null,plans,billing:!!row.paddle_customer_id,support:String(env.THRIVE_SUPPORT_EMAIL||''),paddle:token&&month?{token,priceId:month.priceId,sandbox:token.startsWith('test_')}:null,...extra});
}

// After Paddle's checkout.completed: check the transaction belongs to this account, then record the
// subscription right away instead of waiting for the webhook.
async function confirmCheckout(env,user,body,{admin,fetcher}){
 const id=String(body.transactionId||'');
 if(!/^txn_[a-z0-9]{8,64}$/i.test(id))throw new StoreError('Payment not found.',404);
 const txn=await paddleRequest(env,'/transactions/'+id,{fetcher});
 if(txn.custom_data?.thrive_owner!==user.owner)throw new StoreError('This payment belongs to another account.',403);
 if(!['paid','completed'].includes(txn.status))return {pending:true};
 // Paid but not yet processed: Paddle creates the subscription a moment later, so the browser asks again
 // (and the subscription.created webhook records it too). Guessing dates here would show the wrong ones.
 if(!txn.subscription_id)return {pending:true};
 const sub=await paddleRequest(env,'/subscriptions/'+encodeURIComponent(txn.subscription_id),{fetcher});
 await apply(admin,{...subscriptionSnapshot(sub,{owner:user.owner,eventAt:sub.updated_at}),email:user.email||''});
 forgetPlan(user.owner);
 return {pending:false};
}

// Monthly ↔ yearly. Paddle prorates now: the unused part of the current period counts against the new
// price (charged today, or kept as credit when it covers more), and the subscription renews on the new cycle.
async function switchPlan(env,user,body,{admin,fetcher,now},{preview=false}={}){
 const {row,access}=await accountPlan(env,user,{admin,now,fresh:true}),{month,year}=await paddlePlans(env,{fetcher});
 const target=body.plan==='year'?year:body.plan==='month'?month:null;
 if(!target)throw new StoreError('Choose monthly or yearly.');
 if(access.state==='canceling')throw new StoreError('Your subscription is set to end. Resume it in Manage billing, then switch.',409);
 if(access.state==='past_due')throw new StoreError('Update your payment method first, then switch.',409);
 if(access.state!=='active'||!row.paddle_subscription_id)throw new StoreError('Subscribe first, then choose how you pay.',409);
 if(row.price_id===target.priceId)throw new StoreError('You’re already on this plan.',409);
 const sub=await paddleRequest(env,`/subscriptions/${encodeURIComponent(row.paddle_subscription_id)}${preview?'/preview':''}`,{method:'PATCH',body:{proration_billing_mode:'prorated_immediately',items:[{price_id:target.priceId,quantity:1}]},fetcher,refused:'Paddle couldn’t change your plan right now. Your plan is unchanged; try again later or use Manage billing.'});
 if(preview){
  const result=sub.update_summary?.result,totals=sub.immediate_transaction?.details?.totals;
  const action=result?.action==='credit'?'credit':'charge',amount=String(result?.amount??totals?.grand_total??''),currency=String(result?.currency_code||sub.currency_code||'');
  // Paddle bills a charge against the customer's credit first (e.g. left over from switching to monthly),
  // and the preview's result doesn't count it, so subtract what's available.
  let credit='0';
  if(action==='charge'&&row.paddle_customer_id&&/^\d+$/.test(amount)){
   try{const balances=await paddleRequest(env,`/customers/${encodeURIComponent(row.paddle_customer_id)}/credit-balances`,{fetcher});const available=(Array.isArray(balances)?balances:[]).find(b=>b.currency_code===currency)?.balance?.available;if(/^\d+$/.test(String(available??'')))credit=String(Math.min(Number(available),Number(amount)));}
   catch{}
  }
  return {plan:body.plan,action,amount,credit,due:action==='charge'&&/^\d+$/.test(amount)?String(Number(amount)-Number(credit)):amount,currency,renewsAt:sub.next_billed_at||sub.current_billing_period?.ends_at||null};
 }
 await apply(admin,{...subscriptionSnapshot(sub,{owner:user.owner,eventAt:sub.updated_at||now.toISOString()}),email:user.email||''});
 forgetPlan(user.owner);
 return {switched:body.plan};
}

// Paddle's customer portal: payment method, invoices, cancellation. Links expire, so each click asks anew.
async function portal(env,user,{admin,fetcher,now}){
 const {row}=await accountPlan(env,user,{admin,now});
 if(!row.paddle_customer_id)throw new StoreError('Subscribe first to manage billing.',409);
 const session=await paddleRequest(env,`/customers/${encodeURIComponent(row.paddle_customer_id)}/portal-sessions`,{method:'POST',body:row.paddle_subscription_id?{subscription_ids:[row.paddle_subscription_id]}:{},fetcher});
 const https=v=>typeof v==='string'&&v.startsWith('https://')?v:'';
 const url=https(session?.urls?.general?.overview),payment=https(session?.urls?.subscriptions?.[0]?.update_subscription_payment_method);
 if(!url)throw new StoreError('The billing service is unavailable. Please try again.',502);
 return json({url,payment:payment||url});
}

// Every workspace of the account as JSON. Allowed while locked: your data is always yours.
async function exportData(db,user,now){
 const dir=await loadWorkspace(db,`${user.owner}:workspace-directory`),workspaces=[];
 for(const id of dir?.state?.workspaceIds||['default']){const row=await loadWorkspace(db,workspaceOwner(user.owner,id));if(row)workspaces.push({id,revision:row.revision,updatedAt:row.updatedAt,state:row.state});}
 return new Response(JSON.stringify({exportedAt:now.toISOString(),account:{email:user.email||''},workspaces},null,1),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="thrive-export-${now.toISOString().slice(0,10)}.json"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}

// /api/billing, through withRuntime({allowLocked:true}): GET the plan (?tz= records the time zone for
// trial emails), GET ?export downloads the data, POST {action:'confirm'|'portal'}.
export async function handleBilling(request,env,{db,user},{admin,fetcher=fetch,now=new Date()}={}){
 if(!billingEnabled(env))return json({enabled:false});
 admin??=adminClient(env);const options={admin,fetcher,now};
 const url=new URL(request.url);
 if(request.method==='GET'){
  if(url.searchParams.has('export'))return exportData(db,user,now);
  // The page asking for its plan always reads it fresh: a webhook may have changed it in another isolate.
  const {row}=await accountPlan(env,user,{...options,fresh:true}),tz=url.searchParams.get('tz'),patch={};
  if(validZone(tz)&&tz!==row.time_zone)patch.time_zone=tz;
  if(user.email&&user.email!==row.email)patch.email=String(user.email).slice(0,254);
  if(Object.keys(patch).length){await admin.from('thrive_subscriptions').update(patch).eq('owner_id',user.owner);forgetPlan(user.owner);}
  return planResponse(env,user,options);
 }
 if(request.method!=='POST')throw new StoreError('Method not allowed.',405);
 const body=await readBody(request,4000);
 if(body.action==='confirm'){const result=await confirmCheckout(env,user,body,options);return planResponse(env,user,options,result);}
 if(body.action==='portal')return portal(env,user,options);
 if(body.action==='switch-preview')return json(await switchPlan(env,user,body,options,{preview:true}));
 if(body.action==='switch'){const result=await switchPlan(env,user,body,options);return planResponse(env,user,options,result);}
 throw new StoreError('Unknown billing action.');
}

async function ownerFor(admin,sub){
 for(const [column,value] of [['paddle_subscription_id',sub.id],['paddle_customer_id',sub.customer_id]]){
  if(!value)continue;
  const {data,error}=await admin.from('thrive_subscriptions').select('owner_id').eq(column,value).limit(1);
  if(error)throw unavailable();if(data?.[0])return data[0].owner_id;
 }
 return '';
}
// Paddle notifications (POST /api/billing/webhook). Subscription events carry the whole subscription, so
// each one replaces the stored state; transaction events add nothing Thrive needs.
export async function handlePaddleWebhook(request,env,{admin,now=Date.now()}={}){try{
 if(request.method!=='POST')throw new StoreError('Method not allowed.',405);
 if(!billingEnabled(env)||!env.PADDLE_WEBHOOK_SECRET)throw new StoreError('Billing is not configured.',503);
 const raw=await request.text();if(raw.length>1_000_000)throw new StoreError('Request is too large.',413);
 if(!await verifyPaddleSignature(raw,request.headers.get('paddle-signature'),env.PADDLE_WEBHOOK_SECRET,{now}))throw new StoreError('Invalid signature.',401);
 let event;try{event=JSON.parse(raw);}catch{throw new StoreError('Invalid JSON.');}
 const sub=event?.data;
 if(!String(event?.event_type||'').startsWith('subscription.')||typeof sub?.id!=='string')return json({ok:true,ignored:true});
 admin??=adminClient(env);
 const claimed=sub.custom_data?.thrive_owner,owner=typeof claimed==='string'&&OWNER.test(claimed)?claimed:await ownerFor(admin,sub);
 if(!owner){console.warn('paddle.webhook.unmatched',sub.id);return json({ok:true,ignored:true});}
 const applied=await apply(admin,subscriptionSnapshot(sub,{owner,eventAt:event.occurred_at}));
 forgetPlan(owner);
 return json({ok:true,applied});
}catch(error){return errorResponse(error);}}

// Nylas bills every connected email & calendar account each month, so an account locked for 30 days loses
// its connections (hourly job). Its workspaces stay; subscribing again lets it reconnect.
export const LOCKED_DISCONNECT_DAYS=30;
export async function disconnectLockedAccounts(env,{admin,now=new Date(),disconnect=disconnectNylas}={}){
 if(!billingEnabled(env)||!env.NYLAS_CLIENT_ID)return {disconnected:0};
 admin??=adminClient(env);
 const {data,error}=await admin.from('thrive_nylas_connections').select('owner_id').limit(5000);
 if(error)throw Error('Connection lookup failed.');
 const byAccount=new Map();
 for(const {owner_id:owner} of data||[]){const account=String(owner).split(':workspace:')[0];if(OWNER.test(account))byAccount.set(account,[...(byAccount.get(account)||[]),owner]);}
 const accounts=[...byAccount.keys()],db=new SupabaseDatabase(admin);let disconnected=0;
 for(let i=0;i<accounts.length;i+=100){
  const {data:rows,error:lookup}=await admin.from('thrive_subscriptions').select(COLUMNS).in('owner_id',accounts.slice(i,i+100));
  if(lookup)throw Error('Subscription lookup failed.');
  for(const row of rows||[]){
   const since=isAdmin(env,row.email)?null:lockedSince(row,{now});
   if(since==null||now.getTime()-since<LOCKED_DISCONNECT_DAYS*DAY)continue;
   for(const owner of byAccount.get(row.owner_id)){try{await disconnect(db,owner,env);disconnected++;}catch(e){console.warn('nylas.locked.disconnect',owner,e?.message);}}
  }
 }
 return {disconnected};
}

// Owners whose plan is locked, for jobs that skip them (summaries).
export async function lockedOwners(env,{admin,now=new Date()}={}){
 const locked=new Set();if(!billingEnabled(env))return locked;
 admin??=adminClient(env);
 for(let from=0;from<20000;from+=1000){
  const {data,error}=await admin.from('thrive_subscriptions').select(COLUMNS).order('owner_id').range(from,from+999);
  if(error)throw Error('Subscription lookup failed.');
  for(const row of data||[])if(!isAdmin(env,row.email)&&planAccess(row,{now}).locked)locked.add(row.owner_id);
  if((data||[]).length<1000)break;
 }
 return locked;
}

// Hourly: welcome, 3 days left, last day, and trial ended. Sent from Thrive's own address (Resend) only,
// never from a connected mailbox. The delivery id and trial_email keep each email to one send.
export async function sendTrialEmails(env,{admin,send=sendOwnerNotification,now=new Date(),fetcher=fetch}={}){
 if(!billingEnabled(env)||!env.RESEND_API_KEY||!env.THRIVE_NOTIFICATIONS_FROM)return {sent:0};
 admin??=adminClient(env);
 const {data,error}=await admin.from('thrive_subscriptions').select(COLUMNS).is('status',null).eq('comped',false).neq('trial_email','ended').gt('trial_ends_at',new Date(now.getTime()-3*DAY).toISOString()).limit(500);
 if(error)throw Error('Trial lookup failed.');
 const due=(data||[]).map(row=>[row,trialEmailDue(row,{now})]).filter(([row,stage])=>stage&&row.email&&!isAdmin(env,row.email));
 if(!due.length)return {sent:0};
 const origin=appOrigin(env),{month,year}=await paddlePlans(env,{fetcher}),prices={month:month?.price,year:year?.price},db=new SupabaseDatabase(admin);let sent=0;
 for(const [row,stage] of due){
  const message=trialEmail(stage,{origin,trialEndsAt:row.trial_ends_at,timeZone:row.time_zone,prices});
  const result=await send(db,row.owner_id,env,`trial:${stage}:${row.trial_ends_at}`,row.email,message).catch(()=>null);
  if(result?.status==='sent'){await admin.from('thrive_subscriptions').update({trial_email:stage,updated_at:now.toISOString()}).eq('owner_id',row.owner_id);sent++;}
 }
 return {sent};
}
