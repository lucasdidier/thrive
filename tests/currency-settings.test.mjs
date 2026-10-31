import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkspace} from '../server/account-workspace.mjs';
import {validateWorkspace} from '../server/validation.mjs';
import {setWorkspaceCurrency,billingCurrency,recordCurrency} from '../public/currency.js';
import {saveProjectSettings,saveClientSettings} from '../public/record-settings.js';
import {saveTimeEntry,timeInvoiceData} from '../public/time-domain.js';
import {saveInvoiceDraft,issueInvoiceDraft,createTimeInvoiceDraft,addTimeToInvoiceDraft} from '../public/invoice-domain.js';
import {createDocument,publishDocument} from '../public/workspace-domain.js';
const setup=()=>{const s=emptyWorkspace({name:'Alex',email:'alex@example.com'});s.settings.hourlyRate=12000;const c=saveClientSettings(s,{name:'Client',email:'client@example.com'});const p=saveProjectSettings(s,{name:'Project',clientId:c.id,budgetType:'none'});return {s,c,p};};
const invoice=(c,p)=>({clientId:c.id,projectId:p?.id||'',issued:'2026-10-31',due:'2026-11-15',items:[{description:'Design',quantity:1,rate:10000}]});
const time=(s,p)=>saveTimeEntry(s,{projectId:p.id,minutes:60,date:'2026-10-31',note:''});
const options=t=>({entryIds:[t.id],additionalCharge:true});
test('workspace currency preserves old projects, drafts and published documents while new work follows defaults',()=>{
 const {s,c,p}=setup(),draft=saveInvoiceDraft(s,invoice(c)),doc=createDocument(s,{clientId:c.id,title:'Terms',kind:'document'});doc.scope='Terms';publishDocument(s,doc.id);const old=structuredClone(s);
 setWorkspaceCurrency(s,'EUR');assert.equal(s.settings.currency,'EUR');assert.equal(p.currency,'USD');assert.equal(p.hourlyRate,12000);assert.equal(draft.currency,'USD');assert.equal(doc.versions[0].currency,'USD');validateWorkspace(s,old);
 const next=saveProjectSettings(s,{name:'New project',clientId:c.id,budgetType:'none'});assert.equal(next.currency,'EUR');assert.equal(saveInvoiceDraft(s,invoice(c)).currency,'EUR');assert.equal(issueInvoiceDraft(s,draft.id).currency,'USD');validateWorkspace(s,old);
});
test('client currency applies to new projects and standalone invoices without changing existing records',()=>{
 const {s,c,p}=setup(),old=structuredClone(s);saveClientSettings(s,{...c,currency:'GBP'},c.id);assert.equal(p.currency,'USD');assert.equal(saveInvoiceDraft(s,invoice(c)).currency,'GBP');assert.equal(saveProjectSettings(s,{name:'New project',clientId:c.id,budgetType:'none'}).currency,'GBP');validateWorkspace(s,old);
 saveClientSettings(s,{...c,currency:''},c.id);assert.equal(billingCurrency(s,{clientId:c.id}),'USD');
});
test('project currency change preserves reserved legacy time and invoices old and new time separately',()=>{
 const {s,c,p}=setup(),a=time(s,p),b=time(s,p);delete a.currency;delete a.rate;delete b.currency;delete b.rate;
 const draft=createTimeInvoiceDraft(s,options(a)),old=structuredClone(s);
 saveProjectSettings(s,{name:p.name,clientId:c.id,currency:'EUR',hourlyRate:'95'},p.id);validateWorkspace(s,old);
 assert.equal(recordCurrency(s,s.time.find(t=>t.id===a.id)),'USD');assert.equal(issueInvoiceDraft(s,draft.id).currency,'USD');assert.equal(createTimeInvoiceDraft(s,options(b)).currency,'USD');
 const next=time(s,p);assert.equal(next.currency,'EUR');assert.equal(timeInvoiceData(s,options(next)).currency,'EUR');assert.throws(()=>addTimeToInvoiceDraft(s,s.invoiceDrafts[0].id,options(next)),/same currency/);validateWorkspace(s,old);
});
test('validation rejects relabelled time and mixed currency invoices',()=>{
 const {s,c,p}=setup(),a=time(s,p),old=structuredClone(s);saveProjectSettings(s,{name:p.name,clientId:c.id,currency:'EUR',hourlyRate:'95'},p.id);const b=time(s,p);
 assert.throws(()=>timeInvoiceData(s,{entryIds:[a.id,b.id],additionalCharge:true}),/one currency/);
 const forged=structuredClone(s);forged.time[0].currency='EUR';assert.throws(()=>validateWorkspace(forged,old),/currency/);
 assert.throws(()=>setWorkspaceCurrency(s,'INVALID'),/supported/);
});
test('legacy issued invoices without a currency are safely snapshotted before defaults change',()=>{
 const {s,c,p}=setup(),d=saveInvoiceDraft(s,invoice(c,p)),i=issueInvoiceDraft(s,d.id);delete i.currency;const old=structuredClone(s);
 saveProjectSettings(s,{name:p.name,clientId:c.id,currency:'EUR',hourlyRate:'95'},p.id);
 assert.equal(s.invoices[0].currency,'USD');validateWorkspace(s,old);
 const forged=structuredClone(s);forged.invoices[0].currency='EUR';assert.throws(()=>validateWorkspace(forged,old),/currency/);
});
