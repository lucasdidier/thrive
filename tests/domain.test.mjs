import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import {seed,totals,acceptProposal,generateDeposit,recordPayment,createProject,suggestSetup,publishProposal} from '../public/domain.js';
test('acceptance and payment retries never duplicate the deposit or collected amount',()=>{
 const s=seed();const base=totals(s); publishProposal(s,'p4'); const i=acceptProposal(s,'p4',1);
 assert.equal(i.amount,200000);assert.equal(acceptProposal(s,'p4',1).id,i.id);assert.equal(generateDeposit(s,'p4').id,i.id);
 assert.equal(s.invoices.filter(i=>i.projectId==='p4').length,1);
 assert.equal(s.projects.find(p=>p.id==='p4').status,'awaiting deposit');
 assert.equal(recordPayment(s,i.id),true);assert.equal(recordPayment(s,i.id),false);
 assert.equal(totals(s).paid,base.paid+200000);assert.equal(s.projects.find(p=>p.id==='p4').status,'active');
});
test('paused automation accepts the agreement without silently creating an invoice',()=>{
 const s=seed();s.workflows[0].enabled=false;publishProposal(s,'p4');acceptProposal(s,'p4',1);
 assert.equal(s.invoices.filter(i=>i.projectId==='p4').length,0);
 assert.equal(generateDeposit(s,'p4').amount,200000);
});
test('new settings do not rewrite existing project terms',()=>{
 const s=seed();s.settings.deposit=30;s.settings.phases=['Plan','Deliver'];
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
