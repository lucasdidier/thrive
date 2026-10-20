import {deliveryStatus} from './workspace-domain.js';
import {timeMinutes} from './time-domain.js';
export function dashboardPriorities(s){
 const outstanding=s.invoices.filter(i=>i.amount>i.paid).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
 const awaiting=s.documents.filter(d=>!d.archived&&d.status==='published'&&d.responseMode!=='none');
 const projects=s.projects.filter(p=>!p.archived&&!['completed','cancelled'].includes(p.status)).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
 return {outstanding,awaiting,projects};
}
export function dashboardTotals(s){const projects=s.projects.filter(p=>!p.archived),documents=s.documents.filter(d=>!d.archived),time=s.time.filter(t=>!t.archived);return {projects,documents,time,minutes:time.reduce((sum,t)=>sum+timeMinutes(t),0),billableMinutes:time.filter(t=>t.billable!==false).reduce((sum,t)=>sum+timeMinutes(t),0),paid:s.invoices.filter(i=>i.paid>=i.amount&&i.amount>0),completed:projects.filter(p=>deliveryStatus(p)==='completed').length,signed:documents.filter(d=>d.kind==='contract'&&d.status==='signed').length,accepted:documents.filter(d=>d.kind==='proposal'&&d.status==='accepted').length};}
export function calendarWeek(offset=0,now=new Date()){const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7)+offset*7);const end=new Date(start);end.setDate(end.getDate()+7);return {start,end,days:Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;})};}
export function eventsOnDay(events,day){const end=new Date(day);end.setDate(end.getDate()+1);const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return events.filter(e=>e.allDay?e.start<=localDate(day)&&(e.end>localDate(day)||e.start===localDate(day)):Date.parse(e.start)<+end&&Date.parse(e.end)>+day).sort((a,b)=>a.start.localeCompare(b.start));}
