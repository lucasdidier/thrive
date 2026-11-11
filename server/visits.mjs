// Page views from public/visit.js (supabase/migrations/202611130001_visits.sql). Off unless
// THRIVE_ANALYTICS is "on" (server/analytics.mjs), so self-hosted installs record nothing.
import {adminClient} from './supabase-store.mjs';
import {analyticsEnabled} from './analytics.mjs';
const BOT=/bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|curl|wget|python|fetch/i;
const clip=(v,n,re=/^[\w .:/@-]*$/u)=>{const s=String(v??'').trim().slice(0,n);return re.test(s)?s:'';};
const RETENTION_DAYS=400;

export function visitRow(body,{country=''}={}){
 const path=clip(body?.path,120,/^\/[\w./-]*$/);
 if(!path)return null;
 return {path,lang:clip(body.lang,8,/^[A-Za-z-]*$/),referrer:clip(body.ref,120,/^[a-z0-9.-]*$/i).toLowerCase(),source:clip(body.source,60),medium:clip(body.medium,60),campaign:clip(body.campaign,80),
  country:/^[A-Z]{2}$/.test(country)&&country!=='XX'&&country!=='T1'?country:'',device:['mobile','desktop'].includes(body.device)?body.device:'',new_session:body.first===true};
}

export async function recordVisit(request,env,{admin}={}){
 const done=new Response(null,{status:204});
 if(request.method!=='POST'||!analyticsEnabled(env)||BOT.test(request.headers.get('user-agent')||''))return done;
 if(Number(request.headers.get('content-length')||0)>2000)return done;
 // Only from Thrive's own pages (sendBeacon sends the Origin header).
 const origins=[new URL(request.url).origin,...[env.THRIVE_SITE_URL,env.THRIVE_APP_URL].map(u=>{try{return new URL(u).origin;}catch{return '';}})];
 if(!origins.includes(request.headers.get('origin')||''))return done;
 let body;try{const text=await request.text();if(text.length>2000)return done;body=JSON.parse(text);}catch{return done;}
 const row=visitRow(body,{country:request.headers.get('cf-ipcountry')||''});
 if(row){admin??=adminClient(env);await admin.from('thrive_visits').insert(row).then(()=>{},()=>{});}
 return done;
}

export async function pruneVisits(env,{admin,now=new Date()}={}){
 if(!analyticsEnabled(env))return {skipped:true};
 admin??=adminClient(env);
 const {error}=await admin.from('thrive_visits').delete().lt('at',new Date(now.getTime()-RETENTION_DAYS*864e5).toISOString());
 if(error)throw Error('Unable to prune visits.');
 return {ok:true};
}
