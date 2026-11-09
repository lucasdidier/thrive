// Daily or weekly summary email built from workspace records. Pure: no sends, no clock reads.
import {notificationSettings} from './notification-settings.js';
import {invoiceStatus} from './domain.js';
import {timeStatus,timeMinutes} from './time-domain.js';
import {formatMoney,recordCurrency} from './currency.js';
import {emailLayout} from './email-layout.js';

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
const DATE=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
const shortDate=iso=>{try{return DATE.format(new Date(iso+'T12:00:00Z'));}catch{return iso;}};
const format=(date,timeZone,options)=>{try{return new Intl.DateTimeFormat('en-US',{...options,timeZone}).format(date);}catch{return '';}};
const duration=m=>[Math.floor(m/60)?`${Math.floor(m/60)}h`:'',m%60?`${m%60}m`:''].filter(Boolean).join(' ')||'0m';
const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;
// Returns {subject, body, html}: body is the plain-text part, html the Thrive email layout. Both come from the same rows.
export function buildSummary(s,{now,frequency='daily',origin=''}){
 const {sections}=notificationSettings(s),weekly=frequency==='weekly',span=weekly?7*DAY:DAY,since=now.getTime()-span,until=now.getTime()+span;
 const zone=s.scheduling?.timeZone||'UTC',today=localClock(now,zone).date,client=id=>s.clients.find(c=>c.id===id)?.name||'';
 const blocks=[];
 const add=(key,title,rows,page,count=String(rows.length))=>{if(sections[key]&&rows.length)blocks.push({title,count,rows:rows.slice(0,10),more:Math.max(0,rows.length-10),page});};
 add('meetings',weekly?'Meetings this week':'Meetings today',(s.scheduling?.meetings||[]).filter(m=>m.status!=='cancelled'&&Date.parse(m.start)>=now.getTime()-3600000&&Date.parse(m.start)<until).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)).map(m=>({title:clean(m.typeName),detail:clean(client(m.clientId)||m.contactName),value:format(new Date(m.start),zone,{...(weekly?{weekday:'short'}:{}),hour:'2-digit',minute:'2-digit',hourCycle:'h23'})})),'scheduling');
 add('overdueInvoices','Overdue invoices',s.invoices.filter(i=>!i.archived&&i.issued&&invoiceStatus(i)==='overdue').map(i=>({title:clean(i.number),detail:clean(client(i.clientId)),value:formatMoney(i.amount-i.paid,recordCurrency(s,i))})),'invoices');
 add('awaitingResponse','Waiting on clients',s.documents.filter(d=>!d.archived&&d.status==='published'&&d.responseMode!=='none').filter(d=>{const v=d.versions?.find(v=>v.number===d.currentVersion);return v&&!v.completedAt&&!v.declinedAt;}).map(d=>({title:clean(d.title),detail:[clean(client(d.clientId)),d.kind==='contract'?'Contract':'Proposal'].filter(Boolean).join(' · ')})),'proposals');
 add('projectsDue','Projects due soon',s.projects.filter(p=>!p.archived&&p.due&&!['completed','cancelled'].includes(p.status)&&p.due<=new Date(until+6*DAY).toISOString().slice(0,10)).sort((a,b)=>a.due.localeCompare(b.due)).map(p=>({title:clean(p.name),detail:clean(client(p.clientId)),value:shortDate(p.due),...(p.due<today?{flag:'Late',tone:'negative'}:p.due===today?{flag:'Today',tone:'warning'}:{})})),'projects');
 const unbilled=new Map();for(const t of s.time.filter(t=>timeStatus(s,t)==='unbilled'))unbilled.set(t.projectId||'',(unbilled.get(t.projectId||'')||0)+timeMinutes(t));
 const minutes=[...unbilled.values()].reduce((a,b)=>a+b,0);
 add('unbilledTime','Unbilled time',minutes?[...unbilled].filter(([,m])=>m>0).sort((a,b)=>b[1]-a[1]).map(([id,m])=>{const p=s.projects.find(p=>p.id===id);return {title:clean(p?.name||'No project'),detail:clean(client(p?.clientId)),value:duration(m)};}):[],'time',duration(minutes));
 const replies=Object.values(s.settings.emailFollowUps||{}).filter(c=>c.status==='reply').length;
 add('emailReplies','Emails to reply to',replies?[{title:plural(replies,'conversation')}]:[],'messages');
 add('newResponses','New form responses',s.submissions.filter(x=>Date.parse(x.submittedAt||x.createdAt)>=since).map(x=>({title:clean(x.formTitle),detail:clean(x.contactName||x.clientName||x.contactEmail)})),'forms');
 if(!blocks.length)return null;
 const business=clean(s.settings.business||'Thrive'),subject=`${weekly?'Your week':'Your day'} in ${business}`,link=page=>origin?`${origin}/#${page}`:'';
 const line=r=>'· '+[r.title,r.detail,r.value,r.flag].filter(Boolean).join(' · ');
 const body=[subject,'',...blocks.flatMap(b=>[b.title,...b.rows.map(line),...(b.more?[`and ${b.more} more`]:[]),link(b.page),'']),origin?`Notification settings: ${origin}/#settings/notifications`:'Manage this email in Account settings → Notifications.'].join('\n');
 const html=emailLayout({origin,title:subject,meta:(weekly?'Week of ':'')+format(now,zone,weekly?{month:'long',day:'numeric'}:{weekday:'long',month:'long',day:'numeric'}),preheader:blocks.map(b=>`${b.title} ${b.count}`).join(' · '),sections:blocks.map(b=>({...b,href:link(b.page)})),action:origin?{label:'Open Thrive',href:`${origin}/#overview`}:null,footer:`${weekly?'Weekly':'Daily'} summary for ${business}`});
 return {subject,body,html};
}
