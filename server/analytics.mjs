// Basic product analytics (supabase/migrations/202611120001_usage.sql). public/analytics.js posts small
// batches of {event, page, detail}; only names are kept, never content. Off unless THRIVE_ANALYTICS is "on",
// so self-hosted installs record nothing.
import {adminClient} from './supabase-store.mjs';
const EVENTS=new Set(['open','page','action','submit']);
const NAME=/^[a-z0-9][a-z0-9_./-]*$/i;
const clean=(v,n)=>{const s=String(v??'').trim().slice(0,n);return NAME.test(s)?s:'';};
const RETENTION_DAYS=365;
export const analyticsEnabled=env=>env.THRIVE_ANALYTICS==='on'&&env.THRIVE_DATA_BACKEND==='supabase';

export function usageRows(user,body){
 const list=Array.isArray(body?.events)?body.events.slice(0,30):[];
 return list.map(e=>({event:String(e?.event||''),page:clean(e?.page,60),detail:clean(e?.detail,80)}))
  .filter(e=>EVENTS.has(e.event))
  .map(e=>({owner_id:String(user.owner).slice(0,120),email:String(user.email||'').toLowerCase().slice(0,254),...e}));
}

export async function recordUsage(request,env,user,{admin}={}){
 if(!analyticsEnabled(env)||!user?.owner)return new Response(null,{status:204});
 let body;try{const text=await request.text();if(text.length>8000)return new Response(null,{status:204});body=JSON.parse(text);}catch{return new Response(null,{status:204});}
 const rows=usageRows(user,body);
 if(rows.length){admin??=adminClient(env);await admin.from('thrive_usage').insert(rows).then(()=>{},()=>{});}
 return new Response(null,{status:204});
}

// Nightly: keep 12 months.
export async function pruneUsage(env,{admin,now=new Date()}={}){
 if(!analyticsEnabled(env))return {skipped:true};
 admin??=adminClient(env);
 const {error}=await admin.from('thrive_usage').delete().lt('at',new Date(now.getTime()-RETENTION_DAYS*864e5).toISOString());
 if(error)throw Error('Unable to prune usage events.');
 return {ok:true};
}
