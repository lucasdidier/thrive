// Daily or weekly summary email built from workspace records. Pure: no sends, no clock reads.
import {notificationSettings} from './notification-settings.js';
import {invoiceStatus} from './domain.js';
import {timeStatus,timeMinutes} from './time-domain.js';
import {formatMoney,recordCurrency} from './currency.js';
import {emailLayout} from './email-layout.js';
import {L,Ln,language} from './i18n.js';

const DAY=86400000;
const clean=v=>String(v??'').replace(/[\r\n]+/g,' ').slice(0,160);
// Local date and hour in the workspace time zone.
export function localClock(now,timeZone='UTC'){
 let parts;try{parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(now);}catch{return localClock(now,'UTC');}
 const get=t=>parts.find(p=>p.type===t)?.value;
 return {date:`${get('year')}-${get('month')}-${get('day')}`,hour:Number(get('hour')),weekday:get('weekday')};
}
export function summaryDue(s,now){
 const {summary}=notificationSettings(s);if(summary==='off')return null;
 const clock=localClock(now,s.scheduling?.timeZone||'UTC');
 if(clock.hour!==8||(summary==='weekly'&&clock.weekday!=='Mon'))return null;
 return {frequency:summary,date:clock.date};
}
// Dates in the language the email is written in (server/email-language.mjs sets it while building).
const shortDate=iso=>{try{return new Intl.DateTimeFormat(language(),{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'));}catch{return iso;}};
const format=(date,timeZone,options)=>{try{return new Intl.DateTimeFormat(language(),{...options,timeZone}).format(date);}catch{return '';}};
const duration=m=>[Math.floor(m/60)?`${Math.floor(m/60)}h`:'',m%60?`${m%60}m`:''].filter(Boolean).join(' ')||'0m';
// Returns {subject, body, html}: body is the plain-text part, html the Thrive email layout. Both come from the same rows.
export function buildSummary(s,{now,frequency='daily',origin=''}){
 const {sections}=notificationSettings(s),weekly=frequency==='weekly',span=weekly?7*DAY:DAY,since=now.getTime()-span,until=now.getTime()+span;
 const zone=s.scheduling?.timeZone||'UTC',today=localClock(now,zone).date,client=id=>s.clients.find(c=>c.id===id)?.name||'';
 const blocks=[];
 const add=(key,title,rows,page,count=String(rows.length))=>{if(sections[key]&&rows.length)blocks.push({title,count,rows:rows.slice(0,10),more:Math.max(0,rows.length-10),page});};
 add('meetings',weekly?L('Meetings this week'):L('Meetings today'),(s.scheduling?.meetings||[]).filter(m=>m.status!=='cancelled'&&Date.parse(m.start)>=now.getTime()-3600000&&Date.parse(m.start)<until).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)).map(m=>({title:clean(m.typeName),detail:clean(client(m.clientId)||m.contactName),value:format(new Date(m.start),zone,{...(weekly?{weekday:'short'}:{}),hour:'2-digit',minute:'2-digit',hourCycle:'h23'})})),'scheduling');
 add('overdueInvoices',L('Overdue invoices'),s.invoices.filter(i=>!i.archived&&i.issued&&invoiceStatus(i)==='overdue').map(i=>({title:clean(i.number),detail:clean(client(i.clientId)),value:formatMoney(i.amount-i.paid,recordCurrency(s,i))})),'invoices');
 add('awaitingResponse',L('Waiting on clients'),s.documents.filter(d=>!d.archived&&d.status==='published'&&d.responseMode!=='none').filter(d=>{const v=d.versions?.find(v=>v.number===d.currentVersion);return v&&!v.completedAt&&!v.declinedAt;}).map(d=>({title:clean(d.title),detail:[clean(client(d.clientId)),d.kind==='contract'?L('Contract'):L('Proposal')].filter(Boolean).join(' · ')})),'proposals');
 add('projectsDue',L('Projects due soon'),s.projects.filter(p=>!p.archived&&p.due&&!['completed','cancelled'].includes(p.status)&&p.due<=new Date(until+6*DAY).toISOString().slice(0,10)).sort((a,b)=>a.due.localeCompare(b.due)).map(p=>({title:clean(p.name),detail:clean(client(p.clientId)),value:shortDate(p.due),...(p.due<today?{flag:L('Late'),tone:'negative'}:p.due===today?{flag:L('Today'),tone:'warning'}:{})})),'projects');
 const unbilled=new Map();for(const t of s.time.filter(t=>timeStatus(s,t)==='unbilled'))unbilled.set(t.projectId||'',(unbilled.get(t.projectId||'')||0)+timeMinutes(t));
 const minutes=[...unbilled.values()].reduce((a,b)=>a+b,0);
 add('unbilledTime',L('Unbilled time'),minutes?[...unbilled].filter(([,m])=>m>0).sort((a,b)=>b[1]-a[1]).map(([id,m])=>{const p=s.projects.find(p=>p.id===id);return {title:clean(p?.name||L('No project')),detail:clean(client(p?.clientId)),value:duration(m)};}):[],'time',duration(minutes));
 const replies=Object.values(s.settings.emailFollowUps||{}).filter(c=>c.status==='reply').length;
 add('emailReplies',L('Emails to reply to'),replies?[{title:Ln(replies,'{n} conversation','{n} conversations')}]:[],'messages');
 add('newResponses',L('New form responses'),s.submissions.filter(x=>Date.parse(x.submittedAt||x.createdAt)>=since).map(x=>({title:clean(x.formTitle),detail:clean(x.contactName||x.clientName||x.contactEmail)})),'forms');
 if(!blocks.length)return null;
 const business=clean(s.settings.business||'Thrive'),subject=weekly?L('Your week in {business}',{business}):L('Your day in {business}',{business}),link=page=>origin?`${origin}/#${page}`:'';
 const line=r=>'· '+[r.title,r.detail,r.value,r.flag].filter(Boolean).join(' · ');
 const body=[subject,'',...blocks.flatMap(b=>[b.title,...b.rows.map(line),...(b.more?[L('and {count} more',{count:b.more})]:[]),link(b.page),'']),origin?L('Notification settings: {url}',{url:`${origin}/#settings/notifications`}):L('Manage this email in Account settings → Notifications.')].join('\n');
 const html=emailLayout({origin,title:subject,meta:weekly?L('Week of {date}',{date:format(now,zone,{month:'long',day:'numeric'})}):format(now,zone,{weekday:'long',month:'long',day:'numeric'}),preheader:blocks.map(b=>`${b.title} ${b.count}`).join(' · '),sections:blocks.map(b=>({...b,href:link(b.page)})),action:origin?{label:L('Open Thrive'),href:`${origin}/#overview`}:null,footer:weekly?L('Weekly summary for {business}',{business}):L('Daily summary for {business}',{business})});
 return {subject,body,html};
}
