import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkspace} from '../server/account-workspace.mjs';
import {validateWorkspace} from '../server/validation.mjs';
import {saveProjectSettings,saveClientSettings,budgetLocked,billingDocument} from '../public/record-settings.js';
import {saveTimeEntry} from '../public/time-domain.js';
import {createDocument} from '../public/workspace-domain.js';
import {createManualInvoice} from '../public/invoice-domain.js';
import {moneyGroups} from '../public/currency.js';
const fresh=()=>emptyWorkspace({name:'Alex',email:'alex@example.com'});
const input={name:'Website',clientId:'__new',clientName:'Jo',clientEmail:'jo@example.com',clientType:'individual',budgetType:'none',hourlyRate:'',tags:['UX']};
test('inline client and project creation is atomic, matches email, and persists options',()=>{const s=fresh();const before=JSON.stringify(s);assert.throws(()=>saveProjectSettings(s,{...input,name:''}));assert.equal(JSON.stringify(s),before);const p=saveProjectSettings(s,input);assert.equal(s.clients.length,1);assert.equal(p.needsPricing,true);assert.deepEqual(p.tags,['UX']);assert.equal(p.phases,undefined);assert.equal(p.hourlyRate,null);saveProjectSettings(s,{...input,clientEmail:'JO@example.com'});assert.equal(s.clients.length,1);validateWorkspace(s);});
test('project currency can change after billing without changing issued invoices',()=>{const s=fresh(),p=saveProjectSettings(s,{...input,currency:'EUR',hourlyRate:'95',budgetType:'fixed',budget:'1500'});assert.equal(p.hourlyRate,9500);const i=createManualInvoice(s,{clientId:p.clientId,projectId:p.id,issued:'2026-10-19',due:'2026-11-19',items:[{description:'Work',quantity:1,rate:10000}],taxRate:0},'test-invoice');assert.equal(i.currency,'EUR');const before=structuredClone(s);validateWorkspace(s);saveProjectSettings(s,{...input,clientId:p.clientId,currency:'GBP',hourlyRate:'100',budgetType:'fixed',budget:'1500'},p.id);assert.equal(s.projects[0].currency,'GBP');assert.equal(s.invoices[0].currency,'EUR');assert.equal(s.projects[0].budget,150000);assert.equal(s.projects[0].budgetCurrency,undefined);validateWorkspace(s,before);});
test('logged time and hourly invoices leave the fee editable; a proposal with project billing owns it',()=>{
 const s=fresh(),p=saveProjectSettings(s,{...input,currency:'EUR',budgetType:'none'});
 saveTimeEntry(s,{projectId:p.id,minutes:90,date:'2026-11-02',note:''});createManualInvoice(s,{clientId:p.clientId,projectId:p.id,issued:'2026-11-02',due:'2026-12-02',items:[{description:'Work',quantity:1,rate:10000}],taxRate:0},'hourly-invoice');
 assert.equal(budgetLocked(s,p),false);
 saveProjectSettings(s,{...input,clientId:p.clientId,currency:'EUR',budgetType:'hours',budgetHours:'40'},p.id);assert.equal(s.projects[0].budgetType,'hours');assert.equal(s.projects[0].budgetHours,40);
 saveProjectSettings(s,{...input,clientId:p.clientId,currency:'EUR',budgetType:'fixed',budget:'3000'},p.id);assert.equal(s.projects[0].budget,300000);assert.equal(s.projects[0].needsPricing,false);
 const d=createDocument(s,{clientId:p.clientId,projectId:p.id,kind:'proposal',title:'Lookbook proposal'});
 assert.equal(d.billing,true);assert.equal(billingDocument(s,s.projects[0]).id,d.id);assert.equal(budgetLocked(s,s.projects[0]),true);
 // A locked fee ignores budget fields and keeps its currency when the project currency changes.
 saveProjectSettings(s,{...input,clientId:p.clientId,currency:'GBP',budgetType:'none'},p.id);assert.equal(s.projects[0].budget,300000);assert.equal(s.projects[0].budgetCurrency,'EUR');
 validateWorkspace(s);
});
test('foreign currency supports unpriced projects and client defaults persist',()=>{const s=fresh();const p=saveProjectSettings(s,{...input,currency:'EUR'});assert.equal(p.currency,'EUR');assert.equal(p.hourlyRate,0);const c=saveClientSettings(s,{name:'Jo',email:'another@example.com',type:'individual',hourlyRate:'80',currency:'EUR'});assert.equal(c.hourlyRate,8000);assert.equal(c.currency,'EUR');});
test('mixed currency summaries keep currencies separate',()=>{const s=fresh();assert.match(moneyGroups(s,[{currency:'USD',amount:10000},{currency:'EUR',amount:20000}],r=>r.amount),/\$100.*€200/);});
