import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import {seed,totals,acceptProposal,generateDeposit,recordPayment,createProject,suggestSetup,publishProposal} from '../public/domain.js';
test('acceptance and payment retries never duplicate the deposit or collected amount',()=>{
 const s=seed();const base=totals(s); publishProposal(s,'p4'); const i=acceptProposal(s,'p4',1);
 assert.equal(i.amount,200000);assert.equal(acceptProposal(s,'p4',1).id,i.id);assert.equal(generateDeposit(s,'p4').id,i.id);
 assert.equal(s.invoices.filter(i=>i.projectId==='p4').length,1);
 assert.equal(s.projects.find(p=>p.id==='p4').status,'planned');
 assert.equal(recordPayment(s,i.id),true);assert.equal(recordPayment(s,i.id),false);
 assert.equal(totals(s).paid,base.paid+200000);assert.equal(s.projects.find(p=>p.id==='p4').status,'planned');
});
test('the billing schedule, not a workspace switch, decides whether acceptance invoices the deposit',()=>{
 const auto=seed();auto.workflows[0].enabled=false;publishProposal(auto,'p4');
 assert.equal(acceptProposal(auto,'p4',1).amount,200000);
 const owner=seed();owner.projects.find(p=>p.id==='p4').billingPlan.forEach(r=>{r.trigger='manual';});publishProposal(owner,'p4');acceptProposal(owner,'p4',1);
 assert.equal(owner.invoices.filter(i=>i.projectId==='p4').length,0);
 assert.throws(()=>generateDeposit(owner,'p4'),/No deposit is scheduled/);
});
test('new settings do not rewrite existing project terms',()=>{
 const s=seed();s.settings.deposit=30;
 const p=createProject(s,{name:'New work',clientId:'c1',budget:12345,service:'Design',due:'2026-11-01'});
 assert.equal(p.deposit,30);assert.equal(s.projects.find(p=>p.id==='p4').deposit,50);
 publishProposal(s,p.id);const i=acceptProposal(s,p.id,1);assert.equal(i.amount,3704);assert.ok(Number.isInteger(i.amount));
});
test('invalid relationships, money, and deposit settings are rejected',()=>{
 const s=seed();assert.throws(()=>createProject(s,{name:'X',clientId:'missing',budget:100,service:''}));
 assert.throws(()=>createProject(s,{name:'X',clientId:'c1',budget:-100,service:''}));
 assert.throws(()=>generateDeposit(s,'p4'));assert.throws(()=>suggestSetup('Take 150% upfront'));
 assert.equal(suggestSetup('Website designer, 40% deposit').deposit,40);
 assert.equal(suggestSetup('Monthly recurring invoices').unsupported,true);
});
