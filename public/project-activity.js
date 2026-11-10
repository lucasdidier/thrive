import {money} from './domain.js';
import {recordCurrency} from './currency.js';
import {timeMinutes} from './time-domain.js';
import {hoursMinutes} from './related-list.js';
import {L,language} from './i18n.js';

// Build history from linked records, never from client names or activity text.
export function projectActivity(state, projectId, emailEvents=[]) {
 const events=[];
 const linked=rows=>(rows||[]).filter(row=>row.projectId===projectId);
 const add=(at,text,detail,icon,action,id)=>{
  if(at&&Number.isFinite(Date.parse(at)))events.push({at,text,detail,icon,action,id});
 };
 for(const d of linked(state.documents)){
  add(d.createdAt,L('Created {name}',{name:d.title}),L('Document draft'),d.kind==='contract'?'signature':'documents','document',d.id);
  for(const v of d.versions||[]){
   add(v.createdAt,L('Published {title}',{title:v.title||d.title}),L('Version {number}',{number:v.number}),'documents','document',d.id);
   if(v.completedAt)add(v.completedAt,(v.status==='signed'?L('Signed {title}',{title:v.title||d.title}):v.status==='declined'?L('Declined {title}',{title:v.title||d.title}):L('Accepted {title}',{title:v.title||d.title})),L('Version {number}',{number:v.number}),'check','document',d.id);
  }
 }
 for(const i of linked(state.invoices)){
  add(i.issuedAt||i.issued||i.createdAt,L('Issued {number}',{number:i.number}),money(i.amount,recordCurrency(state,i)),'invoices','invoice',i.id);
  for(const payment of i.payments||[])add(payment.recordedAt||payment.date,L('Payment recorded · {number}',{number:i.number}),[money(payment.amount,recordCurrency(state,i)),payment.method].filter(Boolean).join(' · '),'money','invoice',i.id);
 }
 for(const d of linked(state.invoiceDrafts))add(d.createdAt,L('Created {name}',{name:d.title||L('invoice draft')}),L('Invoice draft'),'invoices','invoice',d.id);
 for(const t of linked(state.time))add(t.createdAt||t.date,L('Time logged'),`${hoursMinutes(timeMinutes(t))} · ${t.note||L('Time entry')}${t.archived?' · '+L('Archived'):''}`,'clock','time-edit',t.id);
 for(const d of linked(state.emailDrafts))add(d.createdAt,L('Email draft created'),d.subject||L('Untitled email'),'mail','mail-edit',d.id);
 for(const f of linked(state.forms))add(f.createdAt,L('Created {name}',{name:f.name}),L('Form'),'forms','edit-form',f.id);
 for(const s of linked(state.submissions))add(s.createdAt,L('Submitted {name}',{name:s.formTitle||L('form')}),s.clientName||L('Form response'),'forms','submission',s.id);
 for(const m of linked(state.scheduling?.meetings)){
  add(m.createdAt,L('Booked {name}',{name:m.typeName||L('meeting')}),m.start?L('Scheduled for {date}',{date:new Intl.DateTimeFormat(language(),{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:m.timeZone||'UTC'}).format(new Date(m.start))}):'','calendar','meeting',m.id);
  add(m.completedAt,L('Completed {name}',{name:m.typeName||L('meeting')}),'','check','meeting',m.id);
 }
 for(const e of linked(state.activity))add(e.createdAt,e.text,e.detail,'projects',null,null);
 for(const e of emailEvents)add(e.at,e.text,e.detail,'mail',e.action,e.id);
 return events.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}
