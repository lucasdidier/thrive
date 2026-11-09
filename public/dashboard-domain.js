import {deliveryStatus} from './workspace-domain.js';
import {timeMinutes} from './time-domain.js';
export function dashboardPriorities(s){
 const outstanding=s.invoices.filter(i=>i.amount>i.paid).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
 const awaiting=s.documents.filter(d=>!d.archived&&d.status==='published'&&d.responseMode!=='none');
 const projects=s.projects.filter(p=>!p.archived&&!['completed','cancelled'].includes(p.status)).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
 return {outstanding,awaiting,projects};
}
export const localDateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function dashboardRange(preset='all',now=new Date(),custom={}){
 const end=localDateKey(now),year=now.getFullYear(),month=now.getMonth();
 if(preset==='month')return {start:localDateKey(new Date(year,month,1)),end};
 if(preset==='last-month')return {start:localDateKey(new Date(year,month-1,1)),end:localDateKey(new Date(year,month,0))};
 if(preset==='year')return {start:`${year}-01-01`,end};
 if(preset==='custom'){
  const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  if(!valid(custom.start)||!valid(custom.end)||custom.start>custom.end)throw Error('Choose a valid start and end date.');
  return {start:custom.start,end:custom.end};
 }
 return null;
}
export function dashboardGreeting(name,now=new Date()){
 const hour=now.getHours(),greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening',first=/^your name$/i.test(String(name||'').trim())?'':String(name||'').trim().split(/\s+/)[0];
 return first?`${greeting}, ${first}`:greeting;
}
export function calendarDay(offset=0,now=new Date()){
 const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()+offset);
 const end=new Date(start);end.setDate(end.getDate()+1);return {start,end};
}
export function dashboardTotals(s,range=null){
 const within=value=>{if(!range)return true;if(!value)return false;const d=/^\d{4}-\d{2}-\d{2}$/.test(value)?value:Number.isFinite(Date.parse(value))?localDateKey(new Date(value)):'';return !!d&&d>=range.start&&d<=range.end;};
 const projects=s.projects.filter(p=>!p.archived),documents=s.documents.filter(d=>!d.archived),time=s.time.filter(t=>!t.archived&&within(t.date));
 const completedDate=d=>d.versions?.find(v=>v.number===d.currentVersion)?.completedAt||d.completedAt;
 return {projects,documents,time,minutes:time.reduce((sum,t)=>sum+timeMinutes(t),0),billableMinutes:time.filter(t=>t.billable!==false).reduce((sum,t)=>sum+timeMinutes(t),0),paid:s.invoices.filter(i=>i.paid>=i.amount&&i.amount>0&&within(i.paidAt||i.payments?.map(p=>p.date).filter(Boolean).sort().at(-1))),completed:projects.filter(p=>deliveryStatus(p)==='completed'&&within(p.completedAt)).length,signed:documents.filter(d=>d.kind==='contract'&&d.status==='signed'&&within(completedDate(d))).length,accepted:documents.filter(d=>d.kind==='proposal'&&d.status==='accepted'&&within(completedDate(d))).length};
}
export function calendarWeek(offset=0,now=new Date()){const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7)+offset*7);const end=new Date(start);end.setDate(end.getDate()+7);return {start,end,days:Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;})};}
export function eventsOnDay(events,day){const end=new Date(day);end.setDate(end.getDate()+1);const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return events.filter(e=>e.allDay?e.start<=localDate(day)&&(e.end>localDate(day)||e.start===localDate(day)):Date.parse(e.start)<+end&&Date.parse(e.end)>+day).sort((a,b)=>a.start.localeCompare(b.start));}
