// "New sign-up" email to THRIVE_SIGNUP_ALERTS when an account opens its workspace for the first time.
// Only production sets that variable, so staging and self-hosted installs send nothing. Resend's
// idempotency key keeps it to one email per account, even if two tabs open the first workspace together.
import {adminEmail} from './beta.mjs';
import {allow} from './limits.mjs';
const clip=(v,n)=>String(v??'').replace(/[\r\n]+/g,' ').trim().slice(0,n);
const via={google:'Google',email:'an email code',azure:'Microsoft',microsoft:'Microsoft'};
export async function sendSignupAlert(env,user,{fetcher=fetch,now=new Date()}={}){
 const to=String(env.THRIVE_SIGNUP_ALERTS||'').trim();
 if(!to||!env.RESEND_API_KEY||!env.THRIVE_NOTIFICATIONS_FROM||!user?.id)return {sent:false};
 const email=clip(user.email,254)||'no email';
 // A burst of sign-ups (real or scripted) shouldn't flood the inbox: 25 alerts a day, the daily digest has the rest.
 if(!await allow(env,'signup-alert:day',{window:86400,max:25}))return {sent:false,capped:true};
 if(adminEmail(env)&&email.toLowerCase()===adminEmail(env))return {sent:false};
 const text=[
  `${clip(user.name,80)||email} just created a Thrive account.`,'',
  `Email: ${email}`,`Signed up with: ${via[user.provider]||clip(user.provider,40)||'unknown'}`,
  ...(clip(user.business,80)?[`Business: ${clip(user.business,80)}`]:[]),
  `When: ${now.toISOString().replace('T',' ').slice(0,16)} UTC`,`Account: ${clip(user.owner,80)}`,
 ].join('\n');
 try{
  const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`signup-${user.id}`},body:JSON.stringify({from:env.THRIVE_NOTIFICATIONS_FROM,to:[to],subject:`New sign-up: ${email}`,text}),signal:AbortSignal.timeout(5000)});
  return {sent:r.ok};
 }catch{return {sent:false};}
}
