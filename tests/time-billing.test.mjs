import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {saveTimeEntry,saveTimeRates,archiveTimeEntry,timeStatus,timeInvoiceData,validateTimeWorkspace,timeMinutes} from '../public/time-domain.js';
import {calculateInvoice,createTimeInvoiceDraft,saveInvoiceDraft,deleteInvoiceDraft,issueInvoiceDraft,createManualInvoice} from '../public/invoice-domain.js';
import {snapshotWorkspace,detectEvents} from '../public/workflow-domain.js';
import {validateWorkspace} from '../server/validation.mjs';
import {executeOperation,actionCatalog} from '../server/operations.mjs';
import {clientProjection} from '../server/sharing.mjs';
import {invoicePaper} from '../public/invoice-paper.js';
const state=()=>initBilling(upgradeWorkspace(seed()));
const entry=(s,data={})=>saveTimeEntry(s,{projectId:s.projects[0].id,minutes:61,date:'2026-10-18',note:'Design review',rate:10001,...data});
const draft=(s,ids,groupBy='entry')=>createTimeInvoiceDraft(s,{entryIds:ids,groupBy,additionalCharge:true});

test('time uses whole minutes, saved rates and reversible archive with legacy hours preserved',()=>{
 const s=state();saveTimeRates(s,{hourlyRate:5000});saveTimeRates(s,{hourlyRate:7500},s.projects[0].id);
 const t=entry(s,{rate:undefined});assert.equal(t.rate,7500);assert.equal(t.hours,61/60);
 saveTimeRates(s,{hourlyRate:9000},s.projects[0].id);assert.equal(t.rate,7500);
 saveTimeRates(s,{hourlyRate:null},s.projects[0].id);assert.equal(entry(s,{rate:undefined}).rate,5000);
 assert.equal(timeMinutes(s.time[0]),1110);assert.equal(s.time[0].minutes,undefined);
 archiveTimeEntry(s,t.id);assert.equal(timeStatus(s,t),'archived');archiveTimeEntry(s,t.id,false);assert.equal(timeStatus(s,t),'unbilled');
 for(const data of [{minutes:0},{minutes:1.1},{minutes:1441},{date:'2026-02-30'},{rate:-1},{rate:1.1},{billable:'false'},{note:''},{projectId:'missing'}]){const before=JSON.stringify(s);assert.throws(()=>entry(s,data));assert.equal(JSON.stringify(s),before);}
});
test('all invoice groupings preserve cents and distinct hourly rates',()=>{
 const s=state(),a=entry(s,{minutes:1}),b=entry(s,{minutes:1}),c=entry(s,{minutes:31,rate:1999}),ids=[a.id,b.id,c.id];
 for(const groupBy of ['entry','day','description']){const data=timeInvoiceData(s,{entryIds:ids,groupBy,additionalCharge:true}),invoice=calculateInvoice(data.items,8.25);assert.equal(invoice.subtotal,1367);assert.equal(invoice.amount,1480);assert.equal(data.items.length,groupBy==='entry'?3:2);}
 const d=draft(s,ids,'description'),i=issueInvoiceDraft(s,d.id);assert.equal(i.amount,1367);assert.match(invoicePaper(i),/0:02/);assert.doesNotMatch(invoicePaper(i),/0\.033333/);validateWorkspace(s);
});
test('time needs a price, one project, billable entries and explicit additional-charge confirmation',()=>{
 const s=state(),a=entry(s),other=entry(s,{projectId:s.projects[1].id}),free=entry(s,{billable:false}),unpriced=entry(s,{rate:0});
 for(const opt of [{entryIds:[a.id],additionalCharge:false},{entryIds:[a.id,other.id],additionalCharge:true},{entryIds:[free.id],additionalCharge:true},{entryIds:[unpriced.id],additionalCharge:true},{entryIds:[a.id,a.id],additionalCharge:true}]){const before=JSON.stringify(s);assert.throws(()=>createTimeInvoiceDraft(s,opt));assert.equal(JSON.stringify(s),before);}
});
test('draft reservations prevent duplicate billing and edits; removing a line or draft releases time',()=>{
 const s=state(),a=entry(s),b=entry(s),d=draft(s,[a.id,b.id]);assert.equal(timeStatus(s,a),'reserved');
 assert.throws(()=>draft(s,[a.id]),/reserved|unbilled/);assert.throws(()=>saveTimeEntry(s,{...a,minutes:2},a.id),/linked/);assert.throws(()=>archiveTimeEntry(s,a.id),/Linked/);
 const edited=structuredClone(d);edited.items[0].rate++;assert.throws(()=>saveInvoiceDraft(s,edited,d.id),/locked|cannot change/);
 const swapped=structuredClone(d);swapped.items[0].rate++;swapped.items[0].timeSources[0].rate++;assert.throws(()=>saveInvoiceDraft(s,swapped,d.id),/cannot change/);
 assert.throws(()=>saveInvoiceDraft(s,{...d,projectId:s.projects[1].id},d.id),/belong/);
 saveInvoiceDraft(s,{...d,items:d.items.slice(1)},d.id);assert.equal(timeStatus(s,a),'unbilled');assert.equal(timeStatus(s,b),'reserved');
 deleteInvoiceDraft(s,d.id);assert.equal(timeStatus(s,b),'unbilled');saveTimeEntry(s,{...a,minutes:62},a.id);validateWorkspace(s);
});
test('issue retains source snapshots and bills once, even when defaults change',()=>{
 const s=state();saveTimeRates(s,{hourlyRate:12345});const legacy=s.time[0],d=draft(s,[legacy.id]);saveTimeRates(s,{hourlyRate:5000});const before=structuredClone(s),i=issueInvoiceDraft(s,d.id);
 assert.equal(i.items[0].rate,12345);assert.equal(i.amount,228383);assert.equal(timeStatus(s,legacy),'billed');assert.equal(issueInvoiceDraft(s,d.id),i);assert.throws(()=>deleteInvoiceDraft(s,d.id));assert.throws(()=>draft(s,[legacy.id]));validateWorkspace(s,before);
 const changed=structuredClone(s);changed.time[0].hours++;assert.throws(()=>validateWorkspace(changed,s),/locked|belong/);
});
test('server rejects forged allocations, duplicate drafts and changed totals',()=>{
 const s=state(),a=entry(s),d=draft(s,[a.id]);
 let changed=structuredClone(s);changed.invoiceDrafts.push({...structuredClone(d),id:'duplicate'});assert.throws(()=>validateWorkspace(changed,s),/already|multiple/);
 changed=structuredClone(s);changed.invoiceDrafts[0].items[0].timeSources[0].rate++;changed.invoiceDrafts[0].items[0].rate++;assert.throws(()=>validateWorkspace(changed,s),/cannot change/);
 changed=structuredClone(s);changed.time[changed.time.length-1].note='Changed';assert.throws(()=>validateWorkspace(changed,s),/locked/);
 const before=JSON.stringify(s);assert.throws(()=>createManualInvoice(s,{...d,id:d.id},'bypass'),/already/);assert.equal(JSON.stringify(s),before);
 issueInvoiceDraft(s,d.id);changed=structuredClone(s);changed.invoices[0].amount++;assert.throws(()=>validateWorkspace(changed),/totals/);
 changed=structuredClone(s);changed.invoices[0].items[0].amount++;assert.throws(()=>validateWorkspace(changed),/line amount/);
});
test('MCP actions and lifecycle triggers use the same time ledger rules',()=>{
 let s=state();const input={data:{projectId:s.projects[0].id,minutes:45,date:'2026-10-18',note:'Agent work',rate:8000}};
 let out=executeOperation(s,'time.save',input,'log-time-1');assert.ok(out.events.some(e=>e.type==='time.created'));s=out.state;const t=out.result;
 out=executeOperation(s,'time.invoice',{entryIds:[t.id],additionalCharge:true,groupBy:'day'},'invoice-time-1');assert.ok(out.events.some(e=>e.type==='time.reserved'));validateWorkspace(out.state,s);s=out.state;
 const before=snapshotWorkspace(s);deleteInvoiceDraft(s,out.result.id);assert.ok(detectEvents(before,s).some(e=>e.type==='time.released'));
 const d=draft(s,[t.id]);out=executeOperation(s,'invoiceDraft.issue',{id:d.id},'issue-time-1');assert.ok(out.events.some(e=>e.type==='time.billed'));validateWorkspace(out.state,s);
 for(const id of ['time.save','time.rates','time.invoice','time.archive','time.restore'])assert.ok(actionCatalog().some(a=>a.id===id));
});
test('many entries can be grouped without changing time or fee agreements',()=>{
 const s=state(),project=structuredClone(s.projects[0]),ids=Array.from({length:31},()=>entry(s,{minutes:10}).id);
 assert.throws(()=>draft(s,ids),/30 invoice/);const d=draft(s,ids,'day');assert.equal(d.items.length,1);assert.equal(d.items[0].timeSources.length,31);assert.deepEqual(s.projects[0],project);validateTimeWorkspace(s);
});

test('shared time invoices show exact durations without exposing source record IDs',()=>{
 const s=state(),t=entry(s),d=draft(s,[t.id]),i=issueInvoiceDraft(s,d.id);const view=clientProjection(s,{entity:'invoice',recordId:i.id});assert.equal(view.data.items[0].durationMinutes,61);assert.equal(view.data.items[0].timeSources,undefined);assert.ok(!JSON.stringify(view).includes(t.id));assert.match(invoicePaper(view.data),/1:01/);
});
