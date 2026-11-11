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
const INK='#14161c',MUTED='#6b7282',SOFT='#8a92a0',LINE='#eceef3',TILE='#f6f7f9';
const longDate=iso=>new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));
// A small chip comparing a number with a previous one: green up, red down, grey flat or unknown.
const delta=(now,before,suffix='')=>{if(!before&&!now)return '';const diff=before?Math.round((now-before)/before*100):null;const up=diff===null?now>0:diff>0,flat=diff===0;const color=flat?MUTED:up?'#0f7a43':'#b33b37',bg=flat?TILE:up?'#e3f6eb':'#fde8e6';return `<span style="display:inline-block;margin-top:6px;padding:2px 7px;border-radius:999px;font-size:11px;font-weight:600;color:${color};background:${bg}">${diff===null?'new':`${diff>0?'▲':diff<0?'▼':'■'} ${Math.abs(diff)}%`}${suffix}</span>`;};
const tiles=items=>`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${items.map(([n,label,extra=''],i)=>`<td width="${Math.floor(100/items.length)}%" style="padding:${i?'0 0 0 8px':'0'};vertical-align:top"><div style="background:${TILE};border-radius:10px;padding:14px 14px 12px"><div style="font-size:24px;line-height:1.1;font-weight:700;color:${INK};letter-spacing:-.02em">${esc(n)}</div><div style="font-size:12px;color:${MUTED};margin-top:4px">${esc(label)}</div>${extra}</div></td>`).join('')}</tr></table>`;
const ranked=(title,pairs,empty='No data yet')=>`<td width="50%" style="vertical-align:top;padding:14px 8px 0 0"><div style="font-size:12px;font-weight:600;color:${INK};margin-bottom:6px">${esc(title)}</div>${pairs.length?`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${pairs.map(([k,n])=>`<tr><td style="font-size:13px;color:#3a4150;padding:4px 0;border-bottom:1px solid ${LINE};overflow:hidden;text-overflow:ellipsis">${esc(k)}</td><td align="right" style="font-size:13px;color:${INK};font-weight:600;padding:4px 0;border-bottom:1px solid ${LINE}">${esc(n)}</td></tr>`).join('')}</table>`:`<div style="font-size:13px;color:${SOFT}">${esc(empty)}</div>`}</td>`;
const grid=cells=>{let out='';for(let i=0;i<cells.length;i+=2)out+=`<tr>${cells[i]}${cells[i+1]||'<td width="50%"></td>'}</tr>`;return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${out}</table>`;};
const section=(title,body)=>`<tr><td style="padding:22px 24px;border-top:1px solid ${LINE}"><div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};font-weight:700;margin-bottom:12px">${title}</div>${body}</td></tr>`;
export function digestHTML(d,{link=''}={}){
 const s=d.seo,v=d.visits,p=d.plans;
 const signups=d.signups.emails.length?`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px">${d.signups.emails.map(e=>{const free=e.endsWith(' (free access)'),email=free?e.slice(0,-14):e;return `<tr><td style="font-size:13px;color:#3a4150;padding:6px 0;border-bottom:1px solid ${LINE}">${esc(email)}${free?` <span style="font-size:11px;color:#3154d5;background:#eef3ff;border-radius:999px;padding:1px 7px;margin-left:4px">free access</span>`:''}</td></tr>`;}).join('')}</table>`:'';
 const search=s?`${tiles([[s.current.clicks,'clicks',delta(s.current.clicks,s.previous.clicks)],[s.current.impressions,'impressions',delta(s.current.impressions,s.previous.impressions)],[(s.current.ctr*100).toFixed(1)+'%','click rate'],[s.current.position?s.current.position.toFixed(1):'–','avg position']])}<div style="font-size:12px;color:${SOFT};margin-top:8px">${esc(s.from)} to ${esc(s.to)}, compared with the 7 days before. Search Console runs 2–3 days behind.</div>${grid([ranked('Top searches',s.queries.map(q=>[q.query,`${q.clicks} / ${q.impressions}`])),ranked('Top pages',s.pages.map(x=>[x.page,`${x.clicks} / ${x.impressions}`]))])}`
  :`<div style="font-size:13px;color:${SOFT}">${esc(d.seoError?'Search Console error: '+d.seoError:'Not connected yet.')}</div>`;
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:24px 12px;background:#f1f2f5;font-family:Inter,-apple-system,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid ${LINE}">
<tr><td style="padding:24px 24px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><div style="font-size:12px;color:${MUTED};font-weight:600">Thrive daily digest</div><div style="font-size:22px;font-weight:700;color:${INK};letter-spacing:-.02em;margin-top:2px">${esc(longDate(d.date))}</div></td><td align="right" style="vertical-align:top"><span style="display:inline-block;background:#3d63ee;color:#fff;font-weight:700;font-size:13px;border-radius:8px;padding:6px 10px">thrive</span></td></tr></table></td></tr>
${section('Visits',tiles([[v.visits,'visits',delta(v.visits,v.lastWeekDaily,' vs last week')],[v.pageViews,'page views'],[v.signupPage,'sign-up page views']])+grid([ranked('Top pages',v.pages),ranked('Sources',v.sources),ranked('Countries',v.countries),ranked('Languages',v.languages)]))}
${section('Sign-ups and plans',tiles([[d.signups.count,'new accounts'],[p.paid,'paying',`<div style="font-size:11px;color:${SOFT};margin-top:4px">${p.monthly} monthly · ${p.yearly} yearly</div>`],['$'+p.mrr,'MRR'],[p.trials,'on trial']])+signups+(p.pastDue?`<div style="font-size:13px;color:#b33b37;margin-top:10px">${p.pastDue} subscription${p.pastDue===1?'':'s'} past due</div>`:''))}
${section('Product',tiles([[d.product.activePeople,'active yesterday'],[d.product.weeklyPeople,'active this week'],[d.product.events,'actions']])+grid([ranked('Most opened',d.product.pages),ranked('Most used',d.product.actions)]))}
${section('Google Search',search)}
<tr><td style="padding:16px 24px;border-top:1px solid ${LINE};font-size:12px;color:${SOFT}">Your own account is left out of these numbers.${link?` <a href="${esc(link)}" style="color:#3154d5">Open in Thrive</a>`:''}</td></tr>
</table></body></html>`;
}

export async function sendDigest(env,{admin,now=new Date(),fetcher=fetch,force=false}={}){
 const to=String(env.THRIVE_DIGEST_TO||'').trim();
 if(!to||!env.RESEND_API_KEY||!env.THRIVE_NOTIFICATIONS_FROM||env.THRIVE_DATA_BACKEND!=='supabase')return {skipped:true};
 const {date,hour}=digestDay(now);
 if(!force&&hour!==HOUR)return {skipped:true};
 const d=await gatherDigest(env,{admin,now,fetcher});
 const subject=`Thrive daily: ${d.visits.visits} visits · ${d.signups.count} sign-up${d.signups.count===1?'':'s'} · ${d.plans.paid} paying`;
 const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':`digest-${date}${force?'-'+now.getTime():''}`},body:JSON.stringify({from:env.THRIVE_NOTIFICATIONS_FROM,to:[to],subject,text:digestText(d),html:digestHTML(d,{link:(()=>{try{return new URL('/api/digest',env.THRIVE_APP_URL).href;}catch{return '';}})()})}),signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Digest email failed.');
 return {sent:true,date};
}
