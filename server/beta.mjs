// Closed beta (THRIVE_ACCESS=invite): invited emails sign in with Google or an emailed code.
// Invites live in thrive_beta_invites; accepted users carry app_metadata.thrive_beta,
// which users cannot edit, so workspace requests need no extra lookup.
import {StoreError} from './store.mjs';
import {json,readBody,errorResponse} from './http.mjs';
import {adminClient,SupabaseDatabase} from './supabase-store.mjs';
import {sendOwnerNotification} from './nylas.mjs';

export const inviteOnly=env=>env.THRIVE_ACCESS==='invite';
export const adminEmail=env=>String(env.THRIVE_ADMIN_EMAIL||'').trim().toLowerCase();
const SYSTEM='system';
// A confirmed email reached through Google or an emailed sign-in code.
const verified=user=>['google','email'].includes(user?.app_metadata?.provider)&&!!user.email_confirmed_at&&!!user.email;
export const hasBetaAccess=user=>verified(user)&&user.app_metadata?.thrive_beta===true;
const cleanEmail=v=>{const e=String(v||'').trim().toLowerCase();if(e.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))throw new StoreError('Enter a valid email address.');return e;};
const line=(v,max)=>String(v??'').replace(/[\r\n]+/g,' ').trim().slice(0,max);

// Whether an email is on the invite list. Deleting the row revokes access.
export async function isInvited(email,env,{admin=adminClient(env)}={}){
 const {data,error}=await admin.from('thrive_beta_invites').select('email').eq('email',String(email).trim().toLowerCase()).maybeSingle();
 if(error)throw new StoreError('Account service unavailable.',503);
 return !!data;
}

// First sign-in for an invited email: flag the account and mark the invite accepted.
export async function grantBetaAccess(user,env,{admin=adminClient(env)}={}){
 if(hasBetaAccess(user))return true;
 if(!verified(user))return false;
 const email=user.email.toLowerCase();
 if(!await isInvited(email,env,{admin}))return false;
 const granted=await admin.auth.admin.updateUserById(user.id,{app_metadata:{...user.app_metadata,thrive_beta:true}});
 if(granted.error)throw new StoreError('Account service unavailable.',503);
 await admin.from('thrive_beta_invites').update({accepted_at:new Date().toISOString()}).eq('email',email).is('accepted_at',null);
 return true;
}

// Landing page "Request access". Same answer whether or not the email is known.
export async function handleBetaRequest(request,env,{admin,send=sendOwnerNotification}={}){try{
 if(request.method!=='POST')throw new StoreError('Method not allowed.',405);
 const origin=new URL(request.url).origin;if(request.headers.get('origin')!==origin)throw new StoreError('Open this page on the Thrive website to continue.',403);
 const body=await readBody(request,4000);
 const done=json({ok:true});
 if(body.website)return done; // honeypot
 const row={email:cleanEmail(body.email),name:line(body.name,80),business:line(body.business,80),work:line(body.work,500)};
 if(!row.name)throw new StoreError('Enter your name.');
 admin??=adminClient(env);
 const {data,error}=await admin.from('thrive_beta_requests').upsert(row,{onConflict:'email',ignoreDuplicates:true}).select('email');
 if(error)throw new StoreError('We could not save your request. Please try again.',503);
 if(data?.length&&adminEmail(env)){
  try{await send(new SupabaseDatabase(admin),SYSTEM,env,'beta-request:'+row.email,adminEmail(env),{subject:`Beta request: ${row.name}${row.business?' · '+row.business:''}`,body:[`${row.name} <${row.email}>`,row.business,row.work,'','Invite them: add their email to thrive_beta_invites in Supabase.'].filter((l,i)=>l||i>2).join('\n')});}catch{console.warn('Beta request notification failed.');}
 }
 return done;
}catch(error){return errorResponse(error);}}

// Hourly: email new invites once. The delivery id keeps reruns from sending twice.
export async function sendBetaInvites(env,{admin=adminClient(env),send=sendOwnerNotification,origin}={}){
 if(!inviteOnly(env)||!env.RESEND_API_KEY||!env.THRIVE_NOTIFICATIONS_FROM)return {sent:0};
 const {data,error}=await admin.from('thrive_beta_invites').select('email').is('emailed_at',null).is('accepted_at',null).limit(50);
 if(error)throw Error('Invite lookup failed.');
 const db=new SupabaseDatabase(admin);let sent=0;
 for(const {email} of data||[]){
  const r=await send(db,SYSTEM,env,'beta-invite:'+email,email,{subject:'You’re invited to Thrive',body:['Your spot in the Thrive beta is ready.','',`Sign in with Google, or ask for an email code, using ${email}:`,`${origin}/auth/sign-in`,'','Reply to this email if anything gets in your way.'].join('\n')}).catch(()=>null);
  if(r?.status==='sent'){await admin.from('thrive_beta_invites').update({emailed_at:new Date().toISOString()}).eq('email',email);sent++;}
 }
 return {sent};
}

// Every account with beta access (for summaries). Pages through all users.
export async function betaUsers(admin){
 const users=[];
 for(let page=1;page<=50;page++){
  const {data,error}=await admin.auth.admin.listUsers({page,perPage:200});if(error)throw Error('Account lookup failed.');
  users.push(...(data?.users||[]));if((data?.users||[]).length<200)break;
 }
 return users.filter(hasBetaAccess);
}
