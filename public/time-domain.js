import {recordCurrency,billingCurrency,defaultHourlyRate} from './currency.js';
import {invoiceDefaults,validateInvoiceDefaults} from './invoice-defaults.js';
import {uid,today,addActivity} from './domain.js';
import {L} from './i18n.js';

const clean=x=>String(x??'').trim();
const validRate=r=>Number.isSafeInteger(r)&&r>=0&&r<=100000000;
export const timeMinutes=t=>t.minutes??Math.round(Number(t.hours)*60);
export const timeDuration=t=>{const m=typeof t==='number'?t:timeMinutes(t);return `${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`;};
export const hourlyRate=(s,p)=>p?.hourlyRate??defaultHourlyRate(s,p?recordCurrency(s,p):undefined);
export const entryRate=(s,t)=>t.rate??hourlyRate(s,s.projects.find(p=>p.id===t.projectId));
export const timeSources=i=>(i.items||[]).flatMap(l=>l.timeSources||[]);
export function timeClaim(s,id){for(const i of s.invoices||[])if(timeSources(i).some(x=>x.id===id))return {status:'billed',invoiceId:i.id,label:i.number,rate:timeSources(i).find(x=>x.id===id).rate};for(const d of s.invoiceDrafts||[])if(timeSources(d).some(x=>x.id===id))return {status:'reserved',invoiceId:d.id,label:d.title,rate:timeSources(d).find(x=>x.id===id).rate};return null;}
export const timeStatus=(s,t)=>timeClaim(s,t.id)?.status||((s.runningTimers||[]).some(r=>r.entryId===t.id)?'running':null)||(t.archived?'archived':t.billable===false?'nonbillable':'unbilled');
function activeProject(s,id){const p=s.projects.find(p=>p.id===id&&!p.archived&&p.status!=='cancelled');if(!p||!s.clients.some(c=>c.id===p.clientId&&!c.archived))throw Error(L('Choose an active project and client.'));return p;}
export function saveTimeEntry(s,data,id){
 const old=id?s.time.find(t=>t.id===id):null;if(id&&!old)throw Error(L('Time entry not found.'));
 if(old&&(s.runningTimers||[]).some(r=>r.entryId===id))throw Error(L('Stop the timer before editing this entry.'));
 if(old&&timeClaim(s,id))throw Error(L('This entry is linked to an invoice. Delete its draft or remove its invoice line before editing.'));
 if(old?.archived)throw Error(L('Restore this entry before editing.'));
 const p=activeProject(s,data.projectId),minutes=data.minutes===undefined?Math.round(Number(data.hours)*60):Number(data.minutes),date=clean(data.date),note=clean(data.note),rate=data.rate===undefined?old?.rate??hourlyRate(s,p):Number(data.rate);
 if(!Number.isSafeInteger(minutes)||minutes<1||minutes>1440)throw Error(L('Enter between 1 and 1,440 whole minutes.'));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error(L('Choose a valid date.'));
 const task=clean(data.task??old?.task);if(task.length>80)throw Error(L('Keep the task to 80 characters or fewer.'));
 if(note.length>200)throw Error(L('Keep the work description to 200 characters or fewer.'));
 if(!validRate(rate))throw Error(L('Enter a valid hourly rate.'));
 if(data.billable!==undefined&&typeof data.billable!=='boolean')throw Error('Billable must be true or false.');
 const t={id:old?.id||uid(),projectId:p.id,currency:old?recordCurrency(s,old):recordCurrency(s,{projectId:p.id}),minutes,hours:minutes/60,date,note,task,rate,billable:data.billable??old?.billable??p.billable??s.settings.billableDefault??true,archived:false,createdAt:old?.createdAt||new Date().toISOString()};
 if(old){Object.assign(old,t);delete old.timerSeconds;}else s.time.push(t);addActivity(s,old?'Time entry updated':'Time logged',`${p.name} · ${timeDuration(t)}`,'project');return old||t;
}
export function archiveTimeEntry(s,id,archived=true){const t=s.time.find(t=>t.id===id);if(!t)throw Error(L('Time entry not found.'));if((s.runningTimers||[]).some(r=>r.entryId===id))throw Error(L('Stop the timer before archiving this entry.'));if(timeClaim(s,id))throw Error(L('Linked time cannot be archived. Delete its invoice draft or remove its line first.'));if(typeof archived!=='boolean')throw Error('Archived must be true or false.');t.archived=archived;return t;}
export function saveTimeRates(s,data,projectId){
 const rate=data.hourlyRate===null?null:Number(data.hourlyRate);if(rate!==null&&!validRate(rate))throw Error(L('Enter a valid hourly rate.'));
 if(projectId){const p=activeProject(s,projectId);p.hourlyRate=rate;return p;}
 if(rate===null)throw Error(L('Enter a workspace hourly rate.'));s.settings.hourlyRate=rate;return {hourlyRate:rate};
}
// Per-entry rounding is stable regardless of the selected invoice grouping.
export function normalizeTimeLine(item){
 if(!Array.isArray(item.timeSources)||!item.timeSources.length||item.timeSources.length>500)throw Error('Invalid time sources.');
 const ids=new Set(),sources=item.timeSources.map(x=>{if(typeof x.id!=='string'||ids.has(x.id)||!Number.isSafeInteger(x.minutes)||x.minutes<1||x.minutes>1440||!validRate(x.rate)||x.rate===0)throw Error('Invalid time source.');ids.add(x.id);return {id:x.id,minutes:x.minutes,rate:x.rate};});
 const rate=sources[0].rate,minutes=sources.reduce((n,x)=>n+x.minutes,0);if(sources.some(x=>x.rate!==rate)||Number(item.rate)!==rate||Math.abs(Number(item.quantity)-minutes/60)>1e-9)throw Error(L('Tracked time quantities and rates are locked. Remove the line to release its entries.'));
 return {timeSources:sources,quantity:minutes/60,rate,amount:sources.reduce((n,x)=>n+Math.round(x.minutes*x.rate/60),0),billingModel:'time',unit:'hour'};
}
export function validateTimeInvoice(s,data,ownId){
 const seen=new Set();for(const line of data.items||[]){if(line.timeSources===undefined)continue;const normalized=normalizeTimeLine(line);for(const source of normalized.timeSources){
  if(seen.has(source.id))throw Error(L('A time entry can only be invoiced once.'));seen.add(source.id);
  const t=s.time.find(t=>t.id===source.id),p=s.projects.find(p=>p.id===t?.projectId),claim=timeClaim(s,source.id);
  if(!t||(s.runningTimers||[]).some(r=>r.entryId===t.id)||t.archived||t.billable===false||!p||data.projectId!==p.id||data.clientId!==p.clientId||source.minutes!==timeMinutes(t))throw Error(L('Time entries must belong to the invoice project and be billable.'));
  if(billingCurrency(s,data)!==recordCurrency(s,t))throw Error(L('Time and invoice must use the same currency.'));
  if(claim&&claim.invoiceId!==ownId)throw Error(L('This time is already reserved by a draft or billed.'));
  const reserved=claim&&[...s.invoices,...s.invoiceDrafts||[]].find(i=>i.id===claim.invoiceId);const prior=reserved&&timeSources(reserved).find(x=>x.id===source.id);if(prior&&(prior.minutes!==source.minutes||prior.rate!==source.rate))throw Error(L('Reserved time quantities and rates cannot change.'));
  if(!claim&&source.rate!==entryRate(s,t))throw Error(L('The hourly rate has changed. Select the time entries again.'));
  if(data.timeBilling?.additionalCharge!==true)throw Error(L('Confirm time is an additional charge, separate from the project fee.'));
 }}return data;
}
export function timeInvoiceData(s,{entryIds,groupBy='entry',additionalCharge=false}){
 if(!Array.isArray(entryIds)||!entryIds.length||entryIds.length>500||new Set(entryIds).size!==entryIds.length)throw Error(L('Select between 1 and 500 different time entries.'));
 if(!['entry','day','description'].includes(groupBy))throw Error(L('Choose how to group the entries.'));
 if(additionalCharge!==true)throw Error(L('Confirm time is an additional charge, separate from the project fee.'));
 const entries=entryIds.map(id=>{const t=s.time.find(t=>t.id===id);if(!t||timeStatus(s,t)!=='unbilled')throw Error(L('Select unbilled, active time entries.'));return t;}),p=activeProject(s,entries[0].projectId);
 if(entries.some(t=>t.projectId!==p.id))throw Error(L('Select entries from one project at a time.'));
 const currency=recordCurrency(s,entries[0]);if(entries.some(t=>recordCurrency(s,t)!==currency))throw Error(L('Select time entries in one currency per invoice.'));
 const groups=new Map();for(const t of entries){const rate=entryRate(s,t);if(!validRate(rate)||rate<1)throw Error(L('Set an hourly rate for every selected entry before invoicing.'));const key=JSON.stringify([groupBy==='entry'?t.id:groupBy==='day'?t.date:t.note||t.task,rate]),g=groups.get(key)||{description:groupBy==='day'?`Services · ${t.date}`:groupBy==='entry'?`${clean(t.note)||clean(t.task)||'Tracked time'} · ${t.date}`:clean(t.note)||clean(t.task)||'Tracked time',rate,timeSources:[]};g.timeSources.push({id:t.id,minutes:timeMinutes(t),rate});groups.set(key,g);}
 if(groups.size>30)throw Error(L('Use day or description grouping, or select fewer entries (30 invoice lines maximum).'));
 const items=[...groups.values()].map(l=>({...l,...normalizeTimeLine({...l,quantity:l.timeSources.reduce((n,x)=>n+x.minutes,0)/60})}));
 return {currency,title:`${p.name} · Tracked time`,clientId:p.clientId,projectId:p.id,issued:today(),due:new Date(Date.now()+invoiceDefaults(s).dueDays*86400000).toISOString().slice(0,10),items,taxRate:invoiceDefaults(s).taxRate,paymentInstructions:s.settings.paymentInstructions||'',timeBilling:{additionalCharge:true,groupBy}};
}
export function validateTimeWorkspace(s,old){
 if(s.settings.hourlyRate!==undefined&&!validRate(s.settings.hourlyRate))throw Error('Invalid workspace hourly rate.');
 for(const p of s.projects)if(p.hourlyRate!=null&&!validRate(p.hourlyRate))throw Error('Invalid project hourly rate.');
 for(const t of s.time){if(t.task!==undefined&&(typeof t.task!=='string'||t.task.length>80))throw Error('Invalid time task.');if(t.actorId!==undefined&&(typeof t.actorId!=='string'||!t.actorId||t.actorId.length>200))throw Error('Invalid time author.');if(t.timerSeconds!==undefined&&(!Number.isSafeInteger(t.timerSeconds)||t.timerSeconds<0||Math.max(1,Math.ceil(t.timerSeconds/60))!==timeMinutes(t)))throw Error('Invalid timer duration.');if(typeof t.note!=='string'||t.note.length>200||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date)throw Error('Invalid time entry description or date.');if(!s.projects.some(p=>p.id===t.projectId)||!Number.isSafeInteger(timeMinutes(t))||timeMinutes(t)<1||timeMinutes(t)>1440||!Number.isFinite(t.hours))throw Error('Invalid time entry.');if(t.minutes!==undefined&&Math.abs(t.hours-t.minutes/60)>1e-9)throw Error('Hours must match minutes.');if(t.rate!==undefined&&!validRate(t.rate))throw Error('Invalid time entry rate.');if(t.billable!==undefined&&typeof t.billable!=='boolean')throw Error('Invalid billable flag.');}
 const seen=new Set();for(const i of [...s.invoices,...s.invoiceDrafts||[]]){validateTimeInvoice(s,i,i.id);for(const x of timeSources(i)){if(seen.has(x.id))throw Error(L('Time entries cannot appear on multiple invoices.'));seen.add(x.id);const priorInvoice=[...old?.invoices||[],...old?.invoiceDrafts||[]].find(p=>p.id===i.id);const prior=priorInvoice&&timeSources(priorInvoice).find(p=>p.id===x.id);if(prior&&JSON.stringify(prior)!==JSON.stringify(x))throw Error(L('Reserved time quantities and rates cannot change.'));if(!prior&&x.rate!==entryRate(s,s.time.find(t=>t.id===x.id)))throw Error(L('Invoice time rate must match its source entry.'));}}
 for(const t of old?.time||[]){const next=s.time.find(x=>x.id===t.id);if(!next)throw Error(L('Archive time entries instead of deleting them.'));if(timeClaim(old,t.id)&&(JSON.stringify({...next,currency:undefined,rate:undefined})!==JSON.stringify({...t,currency:undefined,rate:undefined})||recordCurrency(s,next)!==recordCurrency(old,t)||entryRate(s,next)!==entryRate(old,t)))throw Error(L('Linked time entries are locked. Release the draft before editing.'));}
}

// Eligible source records, shared by every time-to-invoice entry point.
export function unbilledTime(s,{clientId='',projectId='',excludeIds=[]}={}){
 const excluded=new Set(excludeIds);
 return (s.time||[]).filter(t=>{const p=s.projects.find(p=>p.id===t.projectId);return !excluded.has(t.id)&&timeStatus(s,t)==='unbilled'&&p&&!p.archived&&p.status!=='cancelled'&&(!projectId||p.id===projectId)&&(!clientId||p.clientId===clientId)&&s.clients.some(c=>c.id===p.clientId&&!c.archived);});
}
