// The daily digest emailed to THRIVE_DIGEST_TO at 7:00 (Lisbon): yesterday's visits, sign-ups, plans,
// product usage and Search Console numbers. Runs from the hourly cron (server/scheduled.mjs); Resend's
// idempotency key keeps it to one email per day. Only production sets THRIVE_DIGEST_TO.
import {adminClient} from './supabase-store.mjs';
import {adminEmail} from './beta.mjs';
import {searchStats} from './search-console.mjs';
const TZ='Europe/Lisbon',HOUR=7;

// Midnight-to-midnight in Lisbon for the day before `now`, as UTC instants.
export function digestDay(now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 const wall=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second),offset=Math.round((wall-now.getTime())/6e4)*6e4;
 const midnight=Date.UTC(p.year,p.month-1,p.day);
 return {date:new Date(midnight-864e5).toISOString().slice(0,10),start:new Date(midnight-864e5-offset),end:new Date(midnight-offset),hour:p.hour};
}

const top=(rows,key,n=5)=>{const m=new Map();for(const r of rows){const k=typeof key==='function'?key(r):r[key];if(k)m.set(k,(m.get(k)||0)+1);}return [...m].sort((a,b)=>b[1]-a[1]).slice(0,n);};
async function rows(q){const {data,error}=await q;if(error)throw Error(error.message||'Query failed.');return data||[];}
async function count(q){const {count:n,error}=await q;if(error)throw Error(error.message||'Query failed.');return n||0;}

export async function gatherDigest(env,{admin,now=new Date(),fetcher=fetch}={}){
 admin??=adminClient(env);
 const {date,start,end}=digestDay(now),s=start.toISOString(),e=end.toISOString(),weekAgo=new Date(start.getTime()-7*864e5).toISOString();
 const me=adminEmail(env);
 const [views,lastWeekVisits,newAccounts,plans,usage,weekUsers]=await Promise.all([
  rows(admin.from('thrive_visits').select('path,lang,referrer,source,country,new_session').gte('at',s).lt('at',e).limit(20000)),
  count(admin.from('thrive_visits').select('id',{count:'exact',head:true}).eq('new_session',true).gte('at',weekAgo).lt('at',s)),
  rows(admin.from('thrive_subscriptions').select('email,comped').gte('created_at',s).lt('created_at',e).limit(500)),
  rows(admin.from('thrive_subscriptions').select('email,status,price_id,comped,trial_ends_at,paddle_subscription_id').limit(10000)),
  rows(admin.from('thrive_usage').select('owner_id,email,event,page,detail').gte('at',s).lt('at',e).limit(50000)),
  rows(admin.from('thrive_usage').select('owner_id,email').gte('at',new Date(end.getTime()-7*864e5).toISOString()).lt('at',e).limit(100000)),
 ]);
 const notMe=r=>!me||String(r.email||'').toLowerCase()!==me;
 const visits=views.filter(v=>v.new_session);
 const paid=plans.filter(p=>p.paddle_subscription_id&&['active','trialing','past_due'].includes(p.status));
 const yearly=paid.filter(p=>p.price_id&&p.price_id===env.PADDLE_YEARLY_PRICE_ID).length;
 const trials=plans.filter(p=>!p.paddle_subscription_id&&!p.comped&&new Date(p.trial_ends_at)>end&&notMe(p)).length;
 const used=usage.filter(notMe);
 let seo=null,seoError='';
 try{seo=await searchStats(env,{fetcher,now});}catch(error){seoError=error.message;}
 return {date,
  visits:{visits:visits.length,pageViews:views.length,lastWeekDaily:Math.round(lastWeekVisits/7*10)/10,
   pages:top(views,'path'),sources:top(visits,v=>v.source||v.referrer||'direct'),countries:top(visits,'country'),languages:top(visits,'lang'),
   signupPage:views.filter(v=>v.path==='/auth/sign-up').length},
  signups:{count:newAccounts.filter(notMe).length,emails:newAccounts.filter(notMe).map(a=>a.email+(a.comped?' (free access)':''))},
  plans:{paid:paid.length,yearly,monthly:paid.length-yearly,trials,comped:plans.filter(p=>p.comped).length,mrr:Math.round(((paid.length-yearly)*10+yearly*100/12)*100)/100,pastDue:paid.filter(p=>p.status==='past_due').length},
  product:{activePeople:new Set(used.map(u=>u.owner_id)).size,weeklyPeople:new Set(weekUsers.filter(notMe).map(u=>u.owner_id)).size,events:used.length,
   pages:top(used.filter(u=>u.event==='page'),'page'),actions:top(used.filter(u=>u.event==='action'),'detail')},
  seo,seoError};
}

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pct=(a,b)=>b?`${a>=b?'+':''}${Math.round((a-b)/b*100)}%`:'';
const list=pairs=>pairs.length?pairs.map(([k,n])=>`${k} (${n})`).join(', '):'none';
export function digestText(d){
 const s=d.seo;
 const lines=[
  `Thrive, ${d.date}`,'',
  `VISITS: ${d.visits.visits} visits, ${d.visits.pageViews} page views (last week: ${d.visits.lastWeekDaily}/day). Sign-up page views: ${d.visits.signupPage}.`,
  `Top pages: ${list(d.visits.pages)}`,`Sources: ${list(d.visits.sources)}`,`Countries: ${list(d.visits.countries)}`,`Languages: ${list(d.visits.languages)}`,'',
  `SIGN-UPS: ${d.signups.count}${d.signups.emails.length?' · '+d.signups.emails.join(', '):''}`,
  `PLANS: ${d.plans.paid} paying (${d.plans.monthly} monthly, ${d.plans.yearly} yearly) · MRR $${d.plans.mrr} · ${d.plans.trials} on trial · ${d.plans.comped} free access${d.plans.pastDue?` · ${d.plans.pastDue} past due`:''}`,'',
  `PRODUCT: ${d.product.activePeople} active people yesterday, ${d.product.weeklyPeople} this week, ${d.product.events} events.`,
  `Most opened: ${list(d.product.pages)}`,`Most used: ${list(d.product.actions)}`,'',
  s?`SEARCH (${s.from} → ${s.to}): ${s.current.clicks} clicks (${pct(s.current.clicks,s.previous.clicks)||'n/a'}), ${s.current.impressions} impressions (${pct(s.current.impressions,s.previous.impressions)||'n/a'}), CTR ${(s.current.ctr*100).toFixed(1)}%, avg position ${s.current.position.toFixed(1)}.\nTop queries: ${s.queries.map(q=>`${q.query} (${q.clicks}/${q.impressions})`).join(', ')||'none yet'}\nTop pages: ${s.pages.map(p=>`${p.page} (${p.clicks}/${p.impressions})`).join(', ')||'none yet'}`
   :`SEARCH: ${d.seoError?'Search Console error: '+d.seoError:'not connected yet (see docs/launch.md › Daily digest).'}`,
 ];
 return lines.join('\n');
}
export function digestHTML(d){
 const card=(title,body)=>`<tr><td style="padding:18px 20px;border-top:1px solid #eceef3"><div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b7282;font-weight:600;margin-bottom:8px">${title}</div>${body}</td></tr>`;
 const big=(n,label,sub='')=>`<td style="padding-right:24px;vertical-align:top"><div style="font-size:26px;font-weight:700;color:#14161c">${esc(n)}</div><div style="font-size:13px;color:#4a5162">${esc(label)}</div>${sub?`<div style="font-size:12px;color:#8a92a0">${esc(sub)}</div>`:''}</td>`;
 const pairs=(label,p)=>`<div style="font-size:13px;color:#4a5162;margin-top:6px"><b style="color:#14161c">${esc(label)}:</b> ${esc(list(p))}</div>`;
 const s=d.seo;
 return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Inter,-apple-system,Segoe UI,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;border:1px solid #eceef3">
<tr><td style="padding:20px"><div style="font-size:18px;font-weight:700;color:#14161c">Thrive · ${esc(d.date)}</div><div style="font-size:13px;color:#6b7282">Yesterday at a glance</div></td></tr>
${card('Visits',`<table role="presentation"><tr>${big(d.visits.visits,'visits',`last week ${d.visits.lastWeekDaily}/day`)}${big(d.visits.pageViews,'page views')}${big(d.visits.signupPage,'sign-up page views')}</tr></table>${pairs('Top pages',d.visits.pages)}${pairs('Sources',d.visits.sources)}${pairs('Countries',d.visits.countries)}${pairs('Languages',d.visits.languages)}`)}
${card('Sign-ups & plans',`<table role="presentation"><tr>${big(d.signups.count,'new accounts')}${big(d.plans.paid,'paying',`${d.plans.monthly} monthly · ${d.plans.yearly} yearly`)}${big('$'+d.plans.mrr,'MRR')}${big(d.plans.trials,'on trial')}</tr></table>${d.signups.emails.length?`<div style="font-size:13px;color:#4a5162;margin-top:8px">${d.signups.emails.map(esc).join('<br>')}</div>`:''}${d.plans.pastDue?`<div style="font-size:13px;color:#b33b37;margin-top:6px">${d.plans.pastDue} past due</div>`:''}`)}
${card('Product',`<table role="presentation"><tr>${big(d.product.activePeople,'active yesterday')}${big(d.product.weeklyPeople,'active this week')}${big(d.product.events,'events')}</tr></table>${pairs('Most opened',d.product.pages)}${pairs('Most used',d.product.actions)}`)}
${card('Google Search',s?`<table role="presentation"><tr>${big(s.current.clicks,'clicks',pct(s.current.clicks,s.previous.clicks)+' vs prior 7 days')}${big(s.current.impressions,'impressions',pct(s.current.impressions,s.previous.impressions)+' vs prior 7 days')}${big((s.current.ctr*100).toFixed(1)+'%','CTR')}${big(s.current.position.toFixed(1),'avg position')}</tr></table><div style="font-size:12px;color:#8a92a0;margin-top:4px">${esc(s.from)} → ${esc(s.to)} (Search Console lags 2–3 days)</div>${s.queries.length?`<div style="font-size:13px;color:#4a5162;margin-top:6px"><b style="color:#14161c">Top queries:</b> ${s.queries.map(q=>esc(`${q.query} (${q.clicks}/${q.impressions})`)).join(', ')}</div>`:''}${s.pages.length?`<div style="font-size:13px;color:#4a5162;margin-top:6px"><b style="color:#14161c">Top pages:</b> ${s.pages.map(p=>esc(`${p.page} (${p.clicks}/${p.impressions})`)).join(', ')}</div>`:''}`:`<div style="font-size:13px;color:#6b7282">${esc(d.seoError?'Search Console error: '+d.seoError:'Not connected yet.')}</div>`)}
</table></body></html>`;
}

export async function sendDigest(env,{admin,now=new Date(),fetcher=fetch,force=false}={}){
 const to=String(env.THRIVE_DIGEST_TO||'').trim();
 if(!to||!env.RESEND_API_KEY||!env.THRIVE_NOTIFICATIONS_FROM||env.THRIVE_DATA_BACKEND!=='supabase')return {skipped:true};
 const {date,hour}=digestDay(now);
 if(!force&&hour!==HOUR)return {skipped:true};
 const d=await gatherDigest(env,{admin,now,fetcher});
 const subject=`Thrive daily: ${d.visits.visits} visits · ${d.signups.count} sign-up${d.signups.count===1?'':'s'} · ${d.plans.paid} paying`;
 const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`digest-${date}${force?'-'+now.getTime():''}`},body:JSON.stringify({from:env.THRIVE_NOTIFICATIONS_FROM,to:[to],subject,text:digestText(d),html:digestHTML(d)}),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Digest email failed.');
 return {sent:true,date};
}
