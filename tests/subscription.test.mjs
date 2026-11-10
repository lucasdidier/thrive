import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {planAccess,trialEmailDue,trialEmail,priceLabel,formatDay} from '../public/subscription-domain.js';
import {verifyPaddleSignature,subscriptionSnapshot,paddleSandbox} from '../server/paddle.mjs';
import {accountPlan,requireAccess,handleBilling,handlePaddleWebhook,sendTrialEmails,lockedOwners,forgetPlan,billingEnabled} from '../server/subscription.mjs';
import {withRuntime} from '../server/runtime.mjs';
import {runSummaries} from '../server/summaries.mjs';
import {StoreError} from '../server/store.mjs';
import {json} from '../server/http.mjs';

const DAY=86400000,now=new Date('2026-11-10T12:00:00Z'),iso=ms=>new Date(now.getTime()+ms).toISOString();
const env={THRIVE_BILLING:'paddle',THRIVE_AUTH_MODE:'supabase',THRIVE_DATA_BACKEND:'supabase',THRIVE_APP_URL:'https://app.thrive.test',THRIVE_ADMIN_EMAIL:'admin@thrive.test',THRIVE_SUPPORT_EMAIL:'hello@thrive.test',PADDLE_API_KEY:'pdl_sdbx_apikey_test',PADDLE_CLIENT_TOKEN:'test_token',PADDLE_PRICE_ID:'pri_monthly',PADDLE_WEBHOOK_SECRET:'pdl_ntfset_secret',RESEND_API_KEY:'re_test',THRIVE_NOTIFICATIONS_FROM:'Thrive <notifications@thrive.test>'};
let n=0;const account=(email='owner@example.test')=>{const id=`00000000-0000-4000-8000-${String(++n).padStart(12,'0')}`;return {id,owner:'supabase:'+id,email};};

// In-memory stand-in for the thrive_subscriptions queries server/subscription.mjs makes.
function fakeAdmin(rows=[]){
 const calls=[];
 const match=(row,filters)=>filters.every(([op,k,v])=>op==='eq'||op==='is'?row[k]===v:op==='neq'?row[k]!==v:op==='gt'?row[k]>v:true);
 const from=table=>{
  const filters=[];let mode='select',payload,limit=Infinity,range=null,single=false;
  const run=()=>{
   calls.push([table,mode,payload,filters]);
   if(mode==='upsert'){if(!rows.some(r=>r.owner_id===payload.owner_id))rows.push({time_zone:'UTC',trial_email:'',comped:false,status:null,paddle_customer_id:null,paddle_subscription_id:null,period_ends_at:null,cancel_at:null,...payload});return {data:null,error:null};}
   const hits=rows.filter(r=>match(r,filters));
   if(mode==='update'){hits.forEach(r=>Object.assign(r,payload));return {data:hits,error:null};}
   let out=hits.slice(0,limit);if(range)out=out.slice(range[0],range[1]+1);
   return single?{data:out[0]||null,error:null}:{data:out,error:null};
  };
  const q={select:()=>q,order:()=>q,eq:(k,v)=>(filters.push(['eq',k,v]),q),is:(k,v)=>(filters.push(['is',k,v]),q),neq:(k,v)=>(filters.push(['neq',k,v]),q),gt:(k,v)=>(filters.push(['gt',k,v]),q),limit:x=>(limit=x,q),range:(a,b)=>(range=[a,b],q),maybeSingle:()=>(single=true,q),upsert:row=>(mode='upsert',payload=row,q),update:patch=>(mode='update',payload=patch,q),then:(resolve,reject)=>{try{resolve(run());}catch(e){reject(e);}}};
  return q;
 };
 const rpc=async(name,{p})=>{calls.push(['rpc',name,p]);let r=rows.find(x=>x.owner_id===p.owner_id);if(!r){r={owner_id:p.owner_id,trial_ends_at:now.toISOString(),comped:false,trial_email:''};rows.push(r);}Object.assign(r,{paddle_customer_id:p.customer_id??r.paddle_customer_id,paddle_subscription_id:p.subscription_id??r.paddle_subscription_id,status:p.status,period_ends_at:p.period_ends_at,cancel_at:p.cancel_at,price_id:p.price_id,event_at:p.event_at});return {data:true,error:null};};
 return {rows,calls,from,rpc};
}
const paddleApi=(routes,seen=[])=>async(url,init={})=>{const path=new URL(url).pathname;seen.push([init.method||'GET',url,init.body?JSON.parse(init.body):null,init.headers]);const body=routes[path];return body===undefined?Response.json({error:{code:'not_found'}},{status:404}):Response.json({data:body});};
const price={unit_price:{amount:'1000',currency_code:'USD'},billing_cycle:{interval:'month',frequency:1}};
const subscription=(owner,extra={})=>({id:'sub_01abc',status:'active',customer_id:'ctm_01abc',custom_data:{thrive_owner:owner},current_billing_period:{starts_at:iso(0),ends_at:iso(30*DAY)},scheduled_change:null,items:[{price:{id:'pri_monthly'}}],updated_at:iso(0),...extra});
const sign=(raw,ts=Math.floor(now.getTime()/1000),secret=env.PADDLE_WEBHOOK_SECRET)=>`ts=${ts};h1=${createHmac('sha256',secret).update(`${ts}:${raw}`).digest('hex')}`;

test('a trial without a card opens the workspace for 7 days, then locks it until a subscription is live',()=>{
 const row={trial_ends_at:iso(4.5*DAY),status:null};
 assert.deepEqual(planAccess(row,{now}),{state:'trial',locked:false,trialEndsAt:row.trial_ends_at,daysLeft:5,lastDay:false});
 assert.equal(planAccess({...row,trial_ends_at:iso(3*3600000)},{now}).lastDay,true);
 assert.deepEqual(planAccess({...row,trial_ends_at:iso(-1)},{now}),{state:'expired',locked:true,trialEndsAt:iso(-1)});
 assert.equal(planAccess({...row,trial_ends_at:iso(-DAY),status:'active',period_ends_at:iso(20*DAY)},{now}).state,'active');
 assert.equal(planAccess({...row,trial_ends_at:iso(-DAY),status:'active',period_ends_at:iso(20*DAY),cancel_at:iso(20*DAY)},{now}).state,'canceling');
 assert.equal(planAccess({...row,trial_ends_at:iso(-DAY),status:'past_due',period_ends_at:iso(-DAY)},{now}).locked,false);
 assert.deepEqual(planAccess({...row,trial_ends_at:iso(-40*DAY),status:'canceled',period_ends_at:null},{now}),{state:'ended',locked:true,trialEndsAt:iso(-40*DAY)});
 assert.equal(planAccess({...row,trial_ends_at:iso(-40*DAY),status:'paused'},{now}).state,'ended');
 // A paid period that never renewed (no webhook for over a week) stops granting access.
 assert.equal(planAccess({...row,trial_ends_at:iso(-60*DAY),status:'active',period_ends_at:iso(-8*DAY)},{now}).locked,true);
 // Canceling during the trial keeps the trial; comped accounts never lock.
 assert.equal(planAccess({...row,status:'canceled'},{now}).state,'trial');
 assert.equal(planAccess({...row,trial_ends_at:iso(-DAY),comped:true},{now}).state,'comped');
 assert.equal(planAccess({trial_ends_at:iso(-DAY)},{now,comped:true}).locked,false);
});

test('prices and dates read naturally in any currency',()=>{
 assert.equal(priceLabel({amount:'1000',currency:'USD',interval:'month',frequency:1}),'$10 / month');
 assert.equal(priceLabel({amount:'1050',currency:'EUR',interval:'month',frequency:1},{style:'words'}),'€10.50 a month');
 assert.equal(priceLabel({amount:'9600',currency:'USD',interval:'year',frequency:1}),'$96 / year');
 assert.equal(priceLabel({amount:'1500',currency:'JPY',interval:'month',frequency:1}),'¥1,500 / month');
 assert.equal(priceLabel({amount:'3000',currency:'USD',interval:'month',frequency:3}),'$30 every 3 months');
 assert.equal(priceLabel(null),'');assert.equal(priceLabel({amount:'ten',currency:'USD'}),'');
 assert.equal(formatDay('2026-11-17T12:00:00Z','Europe/Lisbon'),'Tuesday, November 17');
 assert.equal(formatDay('2026-11-17T02:00:00Z','America/Los_Angeles'),'Monday, November 16');
 assert.equal(formatDay('2026-11-17T12:00:00Z','Not/AZone'),'Tuesday, November 17');
});

test('trial emails go out once each, in order, and never as a backlog',()=>{
 const row={trial_ends_at:iso(7*DAY),trial_email:'',status:null};
 assert.equal(trialEmailDue(row,{now}),'welcome');
 assert.equal(trialEmailDue({...row,trial_email:'welcome'},{now}),null);
 assert.equal(trialEmailDue({...row,trial_email:'welcome',trial_ends_at:iso(2.5*DAY)},{now}),'3d');
 assert.equal(trialEmailDue({...row,trial_email:'3d',trial_ends_at:iso(20*3600000)},{now}),'1d');
 // An account first seen on its last day gets the last-day email only.
 assert.equal(trialEmailDue({...row,trial_ends_at:iso(20*3600000)},{now}),'1d');
 assert.equal(trialEmailDue({...row,trial_email:'1d',trial_ends_at:iso(-3600000)},{now}),'ended');
 assert.equal(trialEmailDue({...row,trial_email:'1d',trial_ends_at:iso(-4*DAY)},{now}),null);
 assert.equal(trialEmailDue({...row,status:'active'},{now}),null);
 assert.equal(trialEmailDue({...row,comped:true},{now}),null);
 const message=trialEmail('3d',{origin:'https://app.thrive.test',trialEndsAt:'2026-11-13T12:00:00Z',timeZone:'Europe/Lisbon',price:{amount:'1000',currency:'USD',interval:'month',frequency:1}});
 assert.equal(message.subject,'3 days left in your Thrive trial');
 assert.match(message.body,/Friday, November 13/);assert.match(message.body,/\$10 a month/);assert.match(message.body,/https:\/\/app\.thrive\.test\/#account\/plan/);
 assert.match(message.html,/href="https:\/\/app\.thrive\.test\/#account\/plan"[^>]*>Subscribe</);
 assert.match(message.html,/>Plan &amp; billing</);assert.doesNotMatch(message.html,/Notification settings/);
 for(const stage of ['welcome','1d','ended'])assert.ok(trialEmail(stage,{origin:'https://app.thrive.test',trialEndsAt:iso(DAY),timeZone:'UTC',price:null}).html.includes('<h1'));
 assert.doesNotMatch(trialEmail('1d',{origin:'https://app.thrive.test',trialEndsAt:iso(DAY),timeZone:'UTC',price:null}).body,/a month/);
});

test('Paddle webhook signatures are checked against the raw body, the secret and the clock',async()=>{
 const raw='{"event_type":"subscription.updated"}',at=now.getTime();
 assert.equal(await verifyPaddleSignature(raw,sign(raw),env.PADDLE_WEBHOOK_SECRET,{now:at}),true);
 assert.equal(await verifyPaddleSignature(raw+' ',sign(raw),env.PADDLE_WEBHOOK_SECRET,{now:at}),false);
 assert.equal(await verifyPaddleSignature(raw,sign(raw,undefined,'other'),env.PADDLE_WEBHOOK_SECRET,{now:at}),false);
 assert.equal(await verifyPaddleSignature(raw,sign(raw,Math.floor(at/1000)-600),env.PADDLE_WEBHOOK_SECRET,{now:at}),false);
 assert.equal(await verifyPaddleSignature(raw,`${sign(raw,undefined,'old')};h1=${sign(raw).split('h1=')[1]}`,env.PADDLE_WEBHOOK_SECRET,{now:at}),true,'a rotating secret sends two h1 values');
 assert.equal(await verifyPaddleSignature(raw,'',env.PADDLE_WEBHOOK_SECRET,{now:at}),false);
 assert.equal(await verifyPaddleSignature(raw,sign(raw),'',{now:at}),false);
 assert.equal(paddleSandbox({PADDLE_API_KEY:'pdl_sdbx_apikey_x'}),true);assert.equal(paddleSandbox({PADDLE_API_KEY:'pdl_live_apikey_x',PADDLE_CLIENT_TOKEN:'test_x'}),false);assert.equal(paddleSandbox({PADDLE_API_KEY:'legacy',PADDLE_CLIENT_TOKEN:'test_x'}),true);
 assert.deepEqual(subscriptionSnapshot(subscription('supabase:x',{scheduled_change:{action:'cancel',effective_at:iso(30*DAY)}}),{owner:'supabase:x',eventAt:'2026-11-10T12:00:01Z'}),{owner_id:'supabase:x',subscription_id:'sub_01abc',customer_id:'ctm_01abc',status:'active',period_ends_at:iso(30*DAY),cancel_at:iso(30*DAY),price_id:'pri_monthly',event_at:'2026-11-10T12:00:01Z'});
});

test('the first visit starts the trial; the admin is never locked; a locked plan answers 402',async()=>{
 const admin=fakeAdmin(),user=account();
 const {row,access}=await accountPlan(env,user,{admin,now});
 assert.equal(row.trial_ends_at,iso(7*DAY));assert.equal(access.state,'trial');assert.equal(admin.rows.length,1);
 await accountPlan(env,user,{admin,now});assert.equal(admin.rows.length,1);
 assert.equal((await accountPlan({...env,THRIVE_TRIAL_DAYS:'14'},account(),{admin,now})).row.trial_ends_at,iso(14*DAY));
 const late=account(),boss=account('Admin@Thrive.test');
 admin.rows.push({owner_id:late.owner,trial_ends_at:iso(-DAY),comped:false,status:null},{owner_id:boss.owner,trial_ends_at:iso(-DAY),comped:false,status:null});
 await assert.rejects(requireAccess(env,late,{admin,now}),e=>e instanceof StoreError&&e.status===402&&/free trial has ended\. Subscribe at https:\/\/app\.thrive\.test/.test(e.message));
 await requireAccess(env,boss,{admin,now});
 await requireAccess({...env,THRIVE_BILLING:''},late,{admin,now});
 assert.equal(billingEnabled({...env,THRIVE_DATA_BACKEND:'sites'}),false);
 // Locked plans aren't cached: paying unlocks on the very next request.
 admin.rows.find(r=>r.owner_id===late.owner).status='active';
 await requireAccess(env,late,{admin,now});
});

test('every signed-in route but billing is closed while locked; public client links stay open',async()=>{
 const supa={THRIVE_AUTH_MODE:'supabase',THRIVE_APP_URL:'https://thrive.test',SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public'};
 const factory=()=>({client:{auth:{getUser:async()=>({data:{user:{id:'abc-user',email:'owner@example.test',email_confirmed_at:'2026-11-01',app_metadata:{provider:'google'}}},error:null})}},origin:'https://thrive.test',finish:r=>r});
 const locked=async()=>{throw new StoreError('Your Thrive free trial has ended.',402);};
 let r=await withRuntime(new Request('https://thrive.test/api/workspace'),supa,async()=>json({ok:true}),{contextFactory:factory,access:locked});
 assert.equal(r.status,402);assert.match((await r.json()).error,/trial has ended/);
 r=await withRuntime(new Request('https://thrive.test/api/billing'),supa,async()=>json({ok:true}),{contextFactory:factory,access:locked,allowLocked:true});
 assert.equal(r.status,200);
 r=await withRuntime(new Request('https://thrive.test/api/shared/token'),supa,async()=>json({ok:true}),{contextFactory:factory,access:locked,publicAccess:true});
 assert.equal(r.status,200);
});

test('Plan & billing reports the plan and the public checkout settings, never the API key',async()=>{
 const admin=fakeAdmin(),user=account();
 const r=await handleBilling(new Request('https://app.thrive.test/api/billing?tz=Europe%2FLisbon'),env,{db:null,user},{admin,now,fetcher:paddleApi({'/prices/pri_monthly':price})});
 const body=await r.json();
 assert.equal(body.enabled,true);assert.equal(body.access.state,'trial');assert.equal(body.price,'$10 / month');assert.equal(body.owner,user.owner);
 assert.deepEqual(body.paddle,{token:'test_token',priceId:'pri_monthly',sandbox:true});
 assert.doesNotMatch(JSON.stringify(body),/pdl_|secret/);
 assert.equal(admin.rows[0].time_zone,'Europe/Lisbon');
 await handleBilling(new Request('https://app.thrive.test/api/billing?tz=Mars%2FOlympus'),env,{db:null,user},{admin,now,fetcher:paddleApi({})});
 assert.equal(admin.rows[0].time_zone,'Europe/Lisbon');
 assert.deepEqual(await (await handleBilling(new Request('https://app.thrive.test/api/billing'),{...env,THRIVE_BILLING:''},{db:null,user})).json(),{enabled:false});
});

const post=body=>new Request('https://app.thrive.test/api/billing',{method:'POST',headers:{'content-type':'application/json',origin:'https://app.thrive.test'},body:JSON.stringify(body)});
test('a completed checkout opens access at once, and only for the account that paid',async()=>{
 const admin=fakeAdmin(),user=account(),other=account();
 admin.rows.push({owner_id:user.owner,email:user.email,trial_ends_at:iso(-DAY),comped:false,status:null,trial_email:'ended'});
 const seen=[],api=paddleApi({'/transactions/txn_01hpaid0000':{id:'txn_01hpaid0000',status:'completed',custom_data:{thrive_owner:user.owner},subscription_id:'sub_01abc',customer_id:'ctm_01abc'},'/transactions/txn_01hother000':{id:'txn_01hother000',status:'completed',custom_data:{thrive_owner:other.owner}},'/subscriptions/sub_01abc':subscription(user.owner),'/prices/pri_monthly':price},seen);
 const wrong=await handleBilling(post({action:'confirm',transactionId:'txn_01hother000'}),env,{db:null,user},{admin,now,fetcher:api}).catch(e=>e);
 assert.equal(wrong.status,403);
 const r=await handleBilling(post({action:'confirm',transactionId:'txn_01hpaid0000'}),env,{db:null,user},{admin,now,fetcher:api});
 const body=await r.json();assert.equal(body.access.state,'active');assert.equal(body.pending,false);
 assert.equal(admin.rows[0].paddle_subscription_id,'sub_01abc');
 assert.equal(seen[0][3].Authorization,'Bearer pdl_sdbx_apikey_test');assert.match(seen[0][1],/^https:\/\/sandbox-api\.paddle\.com\/transactions\//);
 const bad=await handleBilling(post({action:'confirm',transactionId:'../customers'}),env,{db:null,user},{admin,now,fetcher:api}).catch(e=>e);
 assert.equal(bad.status,404);
});

test('a paid checkout whose subscription is not created yet opens the billing period; an unpaid one waits',async()=>{
 const admin=fakeAdmin(),user=account();
 admin.rows.push({owner_id:user.owner,trial_ends_at:iso(-DAY),comped:false,status:null});
 const api=paddleApi({'/transactions/txn_01hwait0000':{status:'billed',custom_data:{thrive_owner:user.owner}},'/transactions/txn_01hpaid0000':{status:'paid',custom_data:{thrive_owner:user.owner},subscription_id:null,customer_id:'ctm_01abc',billing_period:{starts_at:iso(0),ends_at:iso(30*DAY)},items:[{price:{id:'pri_monthly'}}],updated_at:iso(0)}});
 let body=await (await handleBilling(post({action:'confirm',transactionId:'txn_01hwait0000'}),env,{db:null,user},{admin,now,fetcher:api})).json();
 assert.equal(body.pending,true);assert.equal(body.access.locked,true);
 body=await (await handleBilling(post({action:'confirm',transactionId:'txn_01hpaid0000'}),env,{db:null,user},{admin,now,fetcher:api})).json();
 assert.equal(body.access.state,'active');assert.equal(admin.rows[0].period_ends_at,iso(30*DAY));assert.equal(admin.rows[0].paddle_customer_id,'ctm_01abc');
});

test('the billing portal opens for subscribers with a fresh Paddle session',async()=>{
 const admin=fakeAdmin(),user=account(),seen=[];
 admin.rows.push({owner_id:user.owner,trial_ends_at:iso(-DAY),comped:false,status:'active',period_ends_at:iso(20*DAY),paddle_customer_id:'ctm_01abc',paddle_subscription_id:'sub_01abc'});
 const api=paddleApi({'/customers/ctm_01abc/portal-sessions':{urls:{general:{overview:'https://sandbox-customer-portal.paddle.com/cpl_1'},subscriptions:[{id:'sub_01abc',update_subscription_payment_method:'https://sandbox-customer-portal.paddle.com/cpl_1/pay'}]}}},seen);
 const body=await (await handleBilling(post({action:'portal'}),env,{db:null,user},{admin,now,fetcher:api})).json();
 assert.deepEqual(body,{url:'https://sandbox-customer-portal.paddle.com/cpl_1',payment:'https://sandbox-customer-portal.paddle.com/cpl_1/pay'});
 assert.equal(seen[0][0],'POST');assert.deepEqual(seen[0][2],{subscription_ids:['sub_01abc']});
 const trialing=account();
 const refused=await handleBilling(post({action:'portal'}),env,{db:null,user:trialing},{admin,now,fetcher:api}).catch(e=>e);
 assert.equal(refused.status,409);
});

test('a locked account can still download every workspace it owns',async()=>{
 const user=account(),stored={[`${user.owner}:workspace-directory`]:{revision:1,state:{workspaceIds:['default','studio']}},[user.owner]:{revision:4,state:{clients:[{name:'Juniper Studio'}]}},[`${user.owner}:workspace:studio`]:{revision:2,state:{clients:[]}}};
 const db={kind:'supabase',loadWorkspace:async owner=>stored[owner]||null};
 const r=await handleBilling(new Request('https://app.thrive.test/api/billing?export'),env,{db,user},{admin:fakeAdmin(),now});
 assert.match(r.headers.get('content-disposition'),/attachment; filename="thrive-export-2026-11-10\.json"/);
 const body=await r.json();assert.deepEqual(body.workspaces.map(w=>w.id),['default','studio']);assert.equal(body.workspaces[0].state.clients[0].name,'Juniper Studio');
});

const hook=(event,headers={})=>{const raw=JSON.stringify(event);return new Request('https://app.thrive.test/api/billing/webhook',{method:'POST',headers:{'content-type':'application/json','paddle-signature':sign(raw),...headers},body:raw});};
test('Paddle webhooks update the account the checkout named, or the one that owns the subscription',async()=>{
 const admin=fakeAdmin(),user=account(),at=now.getTime();
 admin.rows.push({owner_id:user.owner,trial_ends_at:iso(DAY),comped:false,status:null});
 let r=await handlePaddleWebhook(hook({event_id:'evt_1',event_type:'subscription.created',occurred_at:iso(0),data:subscription(user.owner)}),env,{admin,now:at});
 assert.deepEqual(await r.json(),{ok:true,applied:true});
 assert.equal(admin.rows[0].status,'active');assert.equal(admin.rows[0].event_at,iso(0));
 forgetPlan(user.owner);
 // Later events without custom data are matched by subscription id.
 r=await handlePaddleWebhook(hook({event_type:'subscription.canceled',occurred_at:iso(1000),data:subscription(user.owner,{status:'canceled',custom_data:null,current_billing_period:null})}),env,{admin,now:at});
 assert.equal(r.status,200);assert.equal(admin.rows[0].status,'canceled');
 r=await handlePaddleWebhook(hook({event_type:'transaction.completed',data:{id:'txn_1'}}),env,{admin,now:at});
 assert.deepEqual(await r.json(),{ok:true,ignored:true});
 r=await handlePaddleWebhook(hook({event_type:'subscription.updated',data:subscription('supabase:not-a-user',{id:'sub_unknown',customer_id:'ctm_unknown'})}),env,{admin,now:at});
 assert.deepEqual(await r.json(),{ok:true,ignored:true});
 r=await handlePaddleWebhook(hook({event_type:'subscription.updated',data:subscription(user.owner)},{'paddle-signature':'ts=1;h1=00'}),env,{admin,now:at});
 assert.equal(r.status,401);
 r=await handlePaddleWebhook(hook({event_type:'subscription.updated',data:subscription(user.owner)}),{...env,PADDLE_WEBHOOK_SECRET:''},{admin,now:at});
 assert.equal(r.status,503);
 assert.equal(admin.calls.filter(c=>c[0]==='rpc').length,2);
});

test('trial emails come from Thrive, once per stage, skipping the admin and subscribers',async()=>{
 const admin=fakeAdmin(),sent=[];
 const rows=[['fresh@example.test',7*DAY,''],['ending@example.test',2*DAY,'welcome'],['done@example.test',-3600000,'1d'],['admin@thrive.test',2*DAY,'welcome']].map(([email,left,stage])=>({owner_id:account(email).owner,email,time_zone:'UTC',trial_ends_at:iso(left),trial_email:stage,comped:false,status:null}));
 admin.rows.push(...rows,{owner_id:account('paid@example.test').owner,email:'paid@example.test',trial_ends_at:iso(2*DAY),trial_email:'welcome',comped:false,status:'active'});
 const send=async(db,owner,_env,id,to,message)=>{sent.push({owner,id,to,subject:message.subject,html:message.html});return {status:'sent'};};
 const result=await sendTrialEmails(env,{admin,send,now,fetcher:paddleApi({'/prices/pri_monthly':price})});
 assert.equal(result.sent,3);
 assert.deepEqual(sent.map(s=>[s.to,s.subject]),[['fresh@example.test','Your Thrive trial has started'],['ending@example.test','3 days left in your Thrive trial'],['done@example.test','Your Thrive trial has ended']]);
 assert.equal(sent[0].id,`trial:welcome:${iso(7*DAY)}`);
 assert.deepEqual(admin.rows.slice(0,3).map(r=>r.trial_email),['welcome','3d','ended']);
 sent.length=0;await sendTrialEmails(env,{admin,send,now});assert.equal(sent.length,0);
 assert.deepEqual(await sendTrialEmails({...env,RESEND_API_KEY:''},{admin,send,now}),{sent:0});
});

test('summaries skip accounts whose trial or subscription has ended',async()=>{
 const users=[{id:'u-open',email:'open@example.test',email_confirmed_at:'2026-11-01'},{id:'u-locked',email:'locked@example.test',email_confirmed_at:'2026-11-01'}],loaded=[];
 const db={kind:'supabase',client:{auth:{admin:{listUsers:async()=>({data:{users},error:null})}}},loadWorkspace:async owner=>{loaded.push(owner);return null;}};
 await runSummaries({THRIVE_DATA_BACKEND:'supabase',THRIVE_ACCESS:'open',THRIVE_APP_URL:'https://app.thrive.test'},{now,backend:()=>({db}),locked:async()=>new Set(['supabase:u-locked'])});
 assert.ok(loaded.some(o=>o.startsWith('supabase:u-open')));assert.ok(!loaded.some(o=>o.startsWith('supabase:u-locked')));
 const admin=fakeAdmin([{owner_id:'supabase:a',email:'a@example.test',trial_ends_at:iso(-DAY),status:null},{owner_id:'supabase:b',email:'b@example.test',trial_ends_at:iso(DAY),status:null},{owner_id:'supabase:c',email:'admin@thrive.test',trial_ends_at:iso(-DAY),status:null}]);
 assert.deepEqual([...await lockedOwners(env,{admin,now})],['supabase:a']);
});

test('billing ships off: no config, docs and the migration agree',()=>{
 const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
 for(const f of ['wrangler.self-hosted.jsonc','wrangler.production.jsonc'])assert.doesNotMatch(read(f),/"THRIVE_BILLING":\s*"paddle"/,`${f} turns billing on only after Paddle is set up`);
 const sql=read('supabase/migrations/202611100001_subscriptions.sql');
 assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.thrive_subscriptions from public, anon, authenticated/);
 assert.match(sql,/revoke all on function public\.thrive_apply_subscription\(jsonb\) from public, anon, authenticated/);
 assert.match(read('docs/launch.md'),/api\/billing\/webhook/);
 const ui=read('public/subscription-ui.js');assert.doesNotMatch(ui,/PADDLE_API_KEY|pdl_/);
});
