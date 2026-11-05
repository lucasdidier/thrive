// Daily or weekly summary email built from workspace records. Pure: no sends, no clock reads.
import {notificationSettings} from './notification-settings.js';
import {invoiceStatus} from './domain.js';
import {timeStatus,timeMinutes} from './time-domain.js';
import {formatMoney,recordCurrency} from './currency.js';

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
export function buildSummary(s,{now,frequency='daily',origin=''}){
 const {sections}=notificationSettings(s),span=frequency==='weekly'?7*DAY:DAY,since=now.getTime()-span,until=now.getTime()+span;
 const today=localClock(now,s.scheduling?.timeZone||'UTC').date,client=id=>s.clients.find(c=>c.id===id)?.name||'';
 const blocks=[];
 const add=(key,title,lines,link)=>{if(sections[key]&&lines.length)blocks.push([title,lines.slice(0,10).concat(lines.length>10?[`and ${lines.length-10} more`]:[]),link]);};
 add('meetings',frequency==='weekly'?'Meetings this week':'Meetings today',(s.scheduling?.meetings||[]).filter(m=>m.status!=='cancelled'&&Date.parse(m.start)>=now.getTime()-3600000&&Date.parse(m.start)<until).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start)).map(m=>`${clean(m.typeName)} with ${clean(client(m.clientId)||m.contactName)}`),'scheduling');
 add('overdueInvoices','Overdue invoices',s.invoices.filter(i=>!i.archived&&i.issued&&invoiceStatus(i)==='overdue').map(i=>`${clean(i.number)} · ${clean(client(i.clientId))} · ${formatMoney(i.amount-i.paid,recordCurrency(s,i))}`),'invoices');
 add('awaitingResponse','Waiting on clients',s.documents.filter(d=>!d.archived&&d.status==='published'&&d.responseMode!=='none').filter(d=>{const v=d.versions?.find(v=>v.number===d.currentVersion);return v&&!v.completedAt&&!v.declinedAt;}).map(d=>`${clean(d.title)} · ${clean(client(d.clientId))}`),'proposals');
 add('projectsDue','Projects due soon',s.projects.filter(p=>!p.archived&&p.due&&!['completed','cancelled'].includes(p.status)&&p.due<=new Date(until+6*DAY).toISOString().slice(0,10)).sort((a,b)=>a.due.localeCompare(b.due)).map(p=>`${clean(p.name)} · due ${p.due}${p.due<today?' (late)':''}`),'projects');
 const unbilled=s.time.filter(t=>timeStatus(s,t)==='unbilled'),minutes=unbilled.reduce((n,t)=>n+timeMinutes(t),0);
 add('unbilledTime','Unbilled time',minutes?[`${Math.floor(minutes/60)}h ${minutes%60}m across ${new Set(unbilled.map(t=>t.projectId)).size} project${new Set(unbilled.map(t=>t.projectId)).size===1?'':'s'}`]:[],'time');
 const replies=Object.values(s.settings.emailFollowUps||{}).filter(c=>c.status==='reply').length;
 add('emailReplies','Emails to reply to',replies?[`${replies} conversation${replies===1?'':'s'}`]:[],'messages');
 add('newResponses','New form responses',s.submissions.filter(x=>Date.parse(x.submittedAt||x.createdAt)>=since).map(x=>`${clean(x.formTitle)} · ${clean(x.contactName||x.clientName||x.contactEmail)}`),'forms');
 if(!blocks.length)return null;
 const subject=`${frequency==='weekly'?'Your week':'Your day'} in ${clean(s.settings.business||'Thrive')}`;
 const body=[subject,'',...blocks.flatMap(([title,lines,link])=>[title,...lines.map(l=>'· '+l),origin?`${origin}/#${link}`:'','']),'Manage this email in Account settings → Notifications.'].join('\n');
 return {subject,body};
}
