import {uid,today,addActivity} from './domain.js';

const clean=x=>String(x??'').trim();
const validRate=r=>Number.isSafeInteger(r)&&r>=0&&r<=100000000;
export const timeMinutes=t=>t.minutes??Math.round(Number(t.hours)*60);
export const timeDuration=t=>{const m=typeof t==='number'?t:timeMinutes(t);return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;};
export const hourlyRate=(s,p)=>p?.hourlyRate??s.settings.hourlyRate??0;
export const entryRate=(s,t)=>t.rate??hourlyRate(s,s.projects.find(p=>p.id===t.projectId));
export const timeSources=i=>(i.items||[]).flatMap(l=>l.timeSources||[]);
export function timeClaim(s,id){for(const i of s.invoices||[])if(timeSources(i).some(x=>x.id===id))return {status:'billed',invoiceId:i.id,label:i.number,rate:timeSources(i).find(x=>x.id===id).rate};for(const d of s.invoiceDrafts||[])if(timeSources(d).some(x=>x.id===id))return {status:'reserved',invoiceId:d.id,label:d.title,rate:timeSources(d).find(x=>x.id===id).rate};return null;}
export const timeStatus=(s,t)=>timeClaim(s,t.id)?.status||(t.archived?'archived':t.billable===false?'nonbillable':'unbilled');
function activeProject(s,id){const p=s.projects.find(p=>p.id===id&&!p.archived&&p.status!=='cancelled');if(!p||!s.clients.some(c=>c.id===p.clientId&&!c.archived))throw Error('Choose an active project and client.');return p;}
export function saveTimeEntry(s,data,id){
 const old=id?s.time.find(t=>t.id===id):null;if(id&&!old)throw Error('Time entry not found.');
 if(old&&timeClaim(s,id))throw Error('This entry is linked to an invoice. Delete its draft or remove its invoice line before editing.');
 if(old?.archived)throw Error('Restore this entry before editing.');
 const p=activeProject(s,data.projectId),minutes=data.minutes===undefined?Math.round(Number(data.hours)*60):Number(data.minutes),date=clean(data.date),note=clean(data.note),rate=data.rate===undefined?old?.rate??hourlyRate(s,p):Number(data.rate);
 if(!Number.isSafeInteger(minutes)||minutes<1||minutes>1440)throw Error('Enter between 1 and 1,440 whole minutes.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('Choose a valid date.');
 if(!note||note.length>200)throw Error('Add a work description of up to 200 characters.');
 if(!validRate(rate))throw Error('Enter a valid hourly rate.');
 if(data.billable!==undefined&&typeof data.billable!=='boolean')throw Error('Billable must be true or false.');
 const t={id:old?.id||uid(),projectId:p.id,minutes,hours:minutes/60,date,note,rate,billable:data.billable??old?.billable??p.billable??true,archived:false,createdAt:old?.createdAt||new Date().toISOString()};
 if(old)Object.assign(old,t);else s.time.push(t);addActivity(s,old?'Time entry updated':'Time logged',`${p.name} · ${timeDuration(t)}`,'project');return old||t;
}
export function archiveTimeEntry(s,id,archived=true){const t=s.time.find(t=>t.id===id);if(!t)throw Error('Time entry not found.');if(timeClaim(s,id))throw Error('Linked time cannot be archived. Delete its invoice draft or remove its line first.');if(typeof archived!=='boolean')throw Error('Archived must be true or false.');t.archived=archived;return t;}
export function saveTimeRates(s,data,projectId){
 const rate=data.hourlyRate===null?null:Number(data.hourlyRate);if(rate!==null&&!validRate(rate))throw Error('Enter a valid hourly rate.');
 if(projectId){const p=activeProject(s,projectId);p.hourlyRate=rate;return p;}
 if(rate===null)throw Error('Enter a workspace hourly rate.');s.settings.hourlyRate=rate;return {hourlyRate:rate};
}
// Per-entry rounding is stable regardless of the selected invoice grouping.
export function normalizeTimeLine(item){
 if(!Array.isArray(item.timeSources)||!item.timeSources.length||item.timeSources.length>500)throw Error('Invalid time sources.');
 const ids=new Set(),sources=item.timeSources.map(x=>{if(typeof x.id!=='string'||ids.has(x.id)||!Number.isSafeInteger(x.minutes)||x.minutes<1||x.minutes>1440||!validRate(x.rate)||x.rate===0)throw Error('Invalid time source.');ids.add(x.id);return {id:x.id,minutes:x.minutes,rate:x.rate};});
 const rate=sources[0].rate,minutes=sources.reduce((n,x)=>n+x.minutes,0);if(sources.some(x=>x.rate!==rate)||Number(item.rate)!==rate||Math.abs(Number(item.quantity)-minutes/60)>1e-9)throw Error('Tracked time quantities and rates are locked. Remove the line to release its entries.');
 return {timeSources:sources,quantity:minutes/60,rate,amount:sources.reduce((n,x)=>n+Math.round(x.minutes*x.rate/60),0),billingModel:'time',unit:'hour'};
}
export function validateTimeInvoice(s,data,ownId){
 const seen=new Set();for(const line of data.items||[]){if(line.timeSources===undefined)continue;const normalized=normalizeTimeLine(line);for(const source of normalized.timeSources){
  if(seen.has(source.id))throw Error('A time entry can only be invoiced once.');seen.add(source.id);
  const t=s.time.find(t=>t.id===source.id),p=s.projects.find(p=>p.id===t?.projectId),claim=timeClaim(s,source.id);
  if(!t||t.archived||t.billable===false||!p||data.projectId!==p.id||data.clientId!==p.clientId||source.minutes!==timeMinutes(t))throw Error('Time entries must belong to the invoice project and be billable.');
  if(claim&&claim.invoiceId!==ownId)throw Error('This time is already reserved by a draft or billed.');
  const reserved=claim&&[...s.invoices,...s.invoiceDrafts||[]].find(i=>i.id===claim.invoiceId);const prior=reserved&&timeSources(reserved).find(x=>x.id===source.id);if(prior&&(prior.minutes!==source.minutes||prior.rate!==source.rate))throw Error('Reserved time quantities and rates cannot change.');
  if(!claim&&source.rate!==entryRate(s,t))throw Error('The hourly rate has changed. Select the time entries again.');
  if(data.timeBilling?.additionalCharge!==true)throw Error('Confirm time is an additional charge, separate from the project fee.');
 }}return data;
}
export function timeInvoiceData(s,{entryIds,groupBy='entry',additionalCharge=false}){
 if(!Array.isArray(entryIds)||!entryIds.length||entryIds.length>500||new Set(entryIds).size!==entryIds.length)throw Error('Select between 1 and 500 different time entries.');
 if(!['entry','day','description'].includes(groupBy))throw Error('Choose how to group the entries.');
 if(additionalCharge!==true)throw Error('Confirm time is an additional charge, separate from the project fee.');
 const entries=entryIds.map(id=>{const t=s.time.find(t=>t.id===id);if(!t||timeStatus(s,t)!=='unbilled')throw Error('Select unbilled, active time entries.');return t;}),p=activeProject(s,entries[0].projectId);
 if(entries.some(t=>t.projectId!==p.id))throw Error('Select entries from one project at a time.');
 const groups=new Map();for(const t of entries){const rate=entryRate(s,t);if(!validRate(rate)||rate<1)throw Error('Set an hourly rate for every selected entry before invoicing.');const key=JSON.stringify([groupBy==='entry'?t.id:groupBy==='day'?t.date:t.note,rate]),g=groups.get(key)||{description:groupBy==='day'?`Services · ${t.date}`:groupBy==='entry'?`${t.note} · ${t.date}`:t.note,rate,timeSources:[]};g.timeSources.push({id:t.id,minutes:timeMinutes(t),rate});groups.set(key,g);}
 if(groups.size>30)throw Error('Use day or description grouping, or select fewer entries (30 invoice lines maximum).');
 const items=[...groups.values()].map(l=>({...l,...normalizeTimeLine({...l,quantity:l.timeSources.reduce((n,x)=>n+x.minutes,0)/60})}));
 return {title:`${p.name} · Tracked time`,clientId:p.clientId,projectId:p.id,issued:today(),due:new Date(Date.now()+14*86400000).toISOString().slice(0,10),items,taxRate:0,paymentInstructions:s.settings.paymentInstructions||'',timeBilling:{additionalCharge:true,groupBy}};
}
export function validateTimeWorkspace(s,old){
 if(s.settings.hourlyRate!==undefined&&!validRate(s.settings.hourlyRate))throw Error('Invalid workspace hourly rate.');
 for(const p of s.projects)if(p.hourlyRate!=null&&!validRate(p.hourlyRate))throw Error('Invalid project hourly rate.');
 for(const t of s.time){if(typeof t.note!=='string'||!t.note.trim()||t.note.length>200||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date)throw Error('Invalid time entry description or date.');if(!s.projects.some(p=>p.id===t.projectId)||!Number.isSafeInteger(timeMinutes(t))||timeMinutes(t)<1||timeMinutes(t)>1440||!Number.isFinite(t.hours))throw Error('Invalid time entry.');if(t.minutes!==undefined&&Math.abs(t.hours-t.minutes/60)>1e-9)throw Error('Hours must match minutes.');if(t.rate!==undefined&&!validRate(t.rate))throw Error('Invalid time entry rate.');if(t.billable!==undefined&&typeof t.billable!=='boolean')throw Error('Invalid billable flag.');}
 const seen=new Set();for(const i of [...s.invoices,...s.invoiceDrafts||[]]){validateTimeInvoice(s,i,i.id);for(const x of timeSources(i)){if(seen.has(x.id))throw Error('Time entries cannot appear on multiple invoices.');seen.add(x.id);const priorInvoice=[...old?.invoices||[],...old?.invoiceDrafts||[]].find(p=>p.id===i.id);const prior=priorInvoice&&timeSources(priorInvoice).find(p=>p.id===x.id);if(prior&&JSON.stringify(prior)!==JSON.stringify(x))throw Error('Reserved time quantities and rates cannot change.');if(!prior&&x.rate!==entryRate(s,s.time.find(t=>t.id===x.id)))throw Error('Invoice time rate must match its source entry.');}}
 for(const t of old?.time||[]){const next=s.time.find(x=>x.id===t.id);if(!next)throw Error('Archive time entries instead of deleting them.');if(timeClaim(old,t.id)&&JSON.stringify(next)!==JSON.stringify(t))throw Error('Linked time entries are locked. Release the draft before editing.');}
}
