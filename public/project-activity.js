import {money} from './domain.js';
import {recordCurrency} from './currency.js';
import {timeMinutes} from './time-domain.js';
import {hoursMinutes} from './related-list.js';

// Build history from linked records, never from client names or activity text.
export function projectActivity(state, projectId, emailEvents=[]) {
 const events=[];
 const linked=rows=>(rows||[]).filter(row=>row.projectId===projectId);
 const add=(at,text,detail,icon,action,id)=>{
  if(at&&Number.isFinite(Date.parse(at)))events.push({at,text,detail,icon,action,id});
 };
 for(const d of linked(state.documents)){
  add(d.createdAt,`Created ${d.title}`,'Document draft',d.kind==='contract'?'signature':'documents','document',d.id);
  for(const v of d.versions||[]){
   add(v.createdAt,`Published ${v.title||d.title}`,`Version ${v.number}`,'documents','document',d.id);
   if(v.completedAt)add(v.completedAt,`${v.status==='signed'?'Signed':v.status==='declined'?'Declined':'Accepted'} ${v.title||d.title}`,`Version ${v.number}`,'check','document',d.id);
  }
 }
 for(const i of linked(state.invoices)){
  add(i.issuedAt||i.issued||i.createdAt,`Issued ${i.number}`,money(i.amount,recordCurrency(state,i)),'invoices','invoice',i.id);
  for(const payment of i.payments||[])add(payment.recordedAt||payment.date,`Payment recorded · ${i.number}`,[money(payment.amount,recordCurrency(state,i)),payment.method].filter(Boolean).join(' · '),'money','invoice',i.id);
 }
 for(const d of linked(state.invoiceDrafts))add(d.createdAt,`Created ${d.title||'invoice draft'}`,'Invoice draft','invoices','invoice',d.id);
 for(const t of linked(state.time))add(t.createdAt||t.date,'Time logged',`${hoursMinutes(timeMinutes(t))} · ${t.note||'Time entry'}${t.archived?' · Archived':''}`,'clock','time-edit',t.id);
 for(const d of linked(state.emailDrafts))add(d.createdAt,'Email draft created',d.subject||'Untitled email','mail','mail-edit',d.id);
 for(const f of linked(state.forms))add(f.createdAt,`Created ${f.name}`,'Form','forms','edit-form',f.id);
 for(const s of linked(state.submissions))add(s.createdAt,`Submitted ${s.formTitle||'form'}`,s.clientName||'Form response','forms','submission',s.id);
 for(const m of linked(state.scheduling?.meetings)){
  add(m.createdAt,`Booked ${m.typeName||'meeting'}`,m.start?`Scheduled for ${new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:m.timeZone||'UTC'}).format(new Date(m.start))}`:'','calendar','meeting',m.id);
  add(m.completedAt,`Completed ${m.typeName||'meeting'}`,'','check','meeting',m.id);
 }
 for(const e of linked(state.activity))add(e.createdAt,e.text,e.detail,'projects',null,null);
 for(const e of emailEvents)add(e.at,e.text,e.detail,'mail',e.action,e.id);
 return events.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}
