// Limits that need longer windows than Cloudflare's rate-limit bindings (10 or 60 seconds), counted in
// Supabase (supabase/migrations/202611140001_limits.sql). If the counter is unavailable they let the
// request through and report it, so a missing migration never locks people out.
import {adminClient} from './supabase-store.mjs';
import {reportError} from './guard.mjs';

export async function hashKey(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(text).toLowerCase()));return [...new Uint8Array(b)].slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');}

// true when this hit is within the limit.
export async function allow(env,key,{window,max},{admin}={}){
 if(env.THRIVE_DATA_BACKEND!=='supabase')return true;
 try{
  admin??=adminClient(env);
  const {data,error}=await admin.rpc('thrive_rate_hit',{p_key:String(key).slice(0,120),p_window:window,p_max:max});
  if(error)throw Error(error.message);
  return data!==false;
 }catch(error){await reportError(env,{source:'limits',message:'Rate counter unavailable: '+(error?.message||error)}).catch(()=>{});return true;}
}

// One person per trial: lowercase, no +tag, and Gmail ignores dots.
export function canonicalEmail(email){
 const [local='',domain='']=String(email||'').trim().toLowerCase().split('@');
 if(!domain)return '';
 let name=local.split('+')[0];
 const gmail=domain==='gmail.com'||domain==='googlemail.com';
 if(gmail)name=name.replace(/\./g,'');
 return `${name}@${gmail?'gmail.com':domain}`;
}
