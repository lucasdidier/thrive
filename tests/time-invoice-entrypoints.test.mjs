import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {saveTimeEntry,timeStatus,unbilledTime} from '../public/time-domain.js';
import {appendTimeInvoiceData,addTimeToInvoiceDraft,saveInvoiceDraft,issueInvoiceDraft,deleteInvoiceDraft,calculateInvoice} from '../public/invoice-domain.js';
import {validateWorkspace} from '../server/validation.mjs';
const state=()=>initBilling(upgradeWorkspace(seed()));
const entry=(s,extra={})=>saveTimeEntry(s,{projectId:s.projects[0].id,minutes:1,date:'2026-10-18',note:'Design review',rate:10001,...extra});
const options=(...rows)=>({entryIds:rows.map(t=>t.id),groupBy:'day',additionalCharge:true});
const data=s=>({title:'October work',clientId:s.projects[0].clientId,projectId:s.projects[0].id,issued:'2026-10-18',due:'2026-11-18',taxRate:10,notes:'Keep these notes',paymentInstructions:'Bank transfer',items:[{description:'Workshop',quantity:1,rate:50000}]});

test('adding time in an unsaved editor preserves details and reserves nothing until save',()=>{
 const s=state(),a=entry(s),b=entry(s),original={...data(s),items:[{description:'',quantity:1,rate:0}]},before=JSON.stringify(s),result=appendTimeInvoiceData(s,original,options(a,b));
 assert.equal(JSON.stringify(s),before);assert.equal(original.items[0].description,'');assert.equal(result.items.length,1);assert.equal(result.items[0].amount,334);assert.equal(result.notes,original.notes);assert.equal(timeStatus(s,a),'unbilled');
 const d=saveInvoiceDraft(s,result);assert.equal(timeStatus(s,a),'reserved');assert.equal(calculateInvoice(d.items,d.taxRate).amount,367);validateWorkspace(s);
});
test('existing draft keeps manual lines and metadata, adds exact time once, and issues safely',()=>{
 const s=state(),a=entry(s),b=entry(s),d=saveInvoiceDraft(s,data(s)),before=structuredClone(s),id=d.id,created=d.createdAt;
 addTimeToInvoiceDraft(s,id,options(a,b));assert.equal(d.id,id);assert.equal(d.createdAt,created);assert.equal(d.notes,'Keep these notes');assert.equal(d.items[0].description,'Workshop');assert.equal(d.items.length,2);assert.equal(d.items[1].amount,334);validateWorkspace(s,before);
 const unchanged=JSON.stringify(s);assert.throws(()=>addTimeToInvoiceDraft(s,id,options(a)),/unbilled|reserved/);assert.equal(JSON.stringify(s),unchanged);
 const i=issueInvoiceDraft(s,id);assert.equal(timeStatus(s,a),'billed');assert.equal(i.amount,55367);assert.throws(()=>addTimeToInvoiceDraft(s,id,options(entry(s))),/Issued/);
});
test('client-wide draft adopts time project, incompatible project, client or currency are rejected atomically',()=>{
 const s=state(),a=entry(s),base=data(s),d=saveInvoiceDraft(s,{...base,projectId:''});addTimeToInvoiceDraft(s,d.id,options(a));assert.equal(d.projectId,a.projectId);deleteInvoiceDraft(s,d.id);
 for(const patch of [{clientId:s.projects[1].clientId},{projectId:s.projects[1].id},{currency:'JPY'}]){const before=JSON.stringify(s);assert.throws(()=>appendTimeInvoiceData(s,{...base,...patch},options(a)));assert.equal(JSON.stringify(s),before);}
});
test('picker eligibility omits claimed, archived, nonbillable, inactive and excluded entries',()=>{
 const s=state(),a=entry(s),b=entry(s),free=entry(s,{billable:false}),unpriced=entry(s,{rate:0}),archived=entry(s);archived.archived=true;
 const d=saveInvoiceDraft(s,appendTimeInvoiceData(s,data(s),options(a)));
 let ids=unbilledTime(s,{projectId:a.projectId,excludeIds:[b.id]}).map(t=>t.id);assert.ok(ids.includes(unpriced.id));for(const t of [a,b,free,archived])assert.ok(!ids.includes(t.id));
 deleteInvoiceDraft(s,d.id);assert.ok(unbilledTime(s).some(t=>t.id===a.id));s.projects[0].archived=true;assert.equal(unbilledTime(s,{projectId:a.projectId}).length,0);
});
test('selection requires confirmation and respects combined invoice line limit without mutations',()=>{
 const s=state(),a=entry(s),base=data(s),before=JSON.stringify(s);
 assert.throws(()=>appendTimeInvoiceData(s,base,{...options(a),additionalCharge:false}),/additional charge/);
 assert.throws(()=>appendTimeInvoiceData(s,{...base,items:Array.from({length:30},()=>base.items[0])},options(a)),/30 invoice/);
 assert.throws(()=>appendTimeInvoiceData(s,base,options()),/Select/);assert.equal(JSON.stringify(s),before);
});
