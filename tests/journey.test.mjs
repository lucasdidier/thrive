import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {baseSeed} from '../public/seed.js';
import {seed,migrate,saveClient,archiveClient,createProject,updateProject,archiveProject,reopenProject,saveProposal,publishProposal,reviseProposal,acceptProposal,declineProposal,recordPayment,approveMilestone,togglePhase,allocatePlan,submitInquiry,saveIntake} from '../public/domain.js';
const make=s=>createProject(s,{name:'Brand design',clientId:'c1',budget:300000,service:'Design',due:'2026-11-30'});
const draftData=p=>({scope:'Design a logo and brand guide.',deliverables:'Logo\nBrand guide',budget:p.budget,phases:p.phases.map(f=>f.name),rules:p.billingPlan});

test('complete $3,000 journey invoices exactly 50/25/25 and completes delivery',()=>{
 const s=seed(),p=make(s);saveProposal(s,p.id,draftData(p));const v=publishProposal(s,p.id);const deposit=acceptProposal(s,p.id,v.number);
 assert.equal(deposit.amount,150000);assert.throws(()=>approveMilestone(s,p.id,p.phases[1].id));recordPayment(s,deposit.id);togglePhase(s,p.id,p.phases[0].id);
 for(const phase of p.phases.slice(1)){const [i]=approveMilestone(s,p.id,phase.id);assert.equal(i.amount,75000);assert.equal(approveMilestone(s,p.id,phase.id)[0].id,i.id);recordPayment(s,i.id);}
 const bills=s.invoices.filter(i=>i.projectId===p.id);assert.equal(bills.length,3);assert.equal(bills.reduce((a,i)=>a+i.amount,0),300000);assert.equal(bills.reduce((a,i)=>a+i.paid,0),300000);assert.equal(p.status,'completed');
});
test('published drafts require revision and stale versions cannot be accepted',()=>{
 const s=seed(),p=make(s);publishProposal(s,p.id);assert.throws(()=>saveProposal(s,p.id,draftData(p)));reviseProposal(s,p.id);saveProposal(s,p.id,{...draftData(p),scope:'Revised scope'});const v2=publishProposal(s,p.id);
 assert.equal(p.versions[0].status,'superseded');assert.throws(()=>acceptProposal(s,p.id,1));assert.equal(s.invoices.filter(i=>i.projectId===p.id).length,0);acceptProposal(s,p.id,v2.number);assert.throws(()=>reviseProposal(s,p.id));assert.throws(()=>saveProposal(s,p.id,draftData(p)));assert.equal(p.acceptedProposal,'Revised scope');
});
test('decline generates no invoice and can be followed by a new revision',()=>{
 const s=seed(),p=make(s);publishProposal(s,p.id);declineProposal(s,p.id,1);assert.equal(p.status,'declined');assert.equal(s.invoices.filter(i=>i.projectId===p.id).length,0);assert.throws(()=>acceptProposal(s,p.id,1));reviseProposal(s,p.id);publishProposal(s,p.id);acceptProposal(s,p.id,2);assert.equal(p.status,'awaiting deposit');
});
test('client changes do not rewrite published documents or issued invoices',()=>{
 const s=seed(),p=make(s);publishProposal(s,p.id);const original=p.versions[0].client.name;saveClient(s,{name:'Renamed studio',contact:'Contact',email:'new@example.com',tag:'Design'},'c1');const i=acceptProposal(s,p.id,1);assert.equal(i.clientName,original);assert.equal(p.versions[0].client.name,original);assert.notEqual(s.clients[0].name,original);
});
test('billing validation catches underallocation, duplicate phase triggers, IDs, and fractional cents',()=>{
 const s=seed(),p=make(s);assert.throws(()=>allocatePlan(300000,p.billingPlan.map((r,i)=>({...r,percent:i===0?40:r.percent})),p.phases));assert.throws(()=>allocatePlan(300000,p.billingPlan.map((r,i)=>({...r,phaseId:i?p.phases[1].id:null})),p.phases));assert.throws(()=>allocatePlan(300000,p.billingPlan.map(r=>({...r,id:'same'})),p.phases));
 const plan=allocatePlan(10001,p.billingPlan,p.phases);assert.equal(plan.reduce((a,r)=>a+r.amount,0),10001);assert.ok(plan.every(r=>Number.isInteger(r.amount)));
});
test('invalid proposal edits leave previous commercial terms intact',()=>{
 const s=seed(),p=make(s),before=JSON.stringify(p);assert.throws(()=>saveProposal(s,p.id,{...draftData(p),budget:999999,rules:[]}));assert.equal(JSON.stringify(p),before);
});
test('client archive is reversible and never deletes financial history',()=>{
 const s=seed(),before=s.invoices.length;archiveClient(s,'c1');assert.throws(()=>make(s));assert.equal(s.invoices.length,before);archiveClient(s,'c1');assert.ok(make(s));
});
test('archived or cancelled projects cannot accept proposals or trigger milestone invoices',()=>{
 const s=seed(),p=make(s);publishProposal(s,p.id);archiveProject(s,p.id);assert.throws(()=>acceptProposal(s,p.id,1));archiveProject(s,p.id);updateProject(s,p.id,{name:p.name,service:p.service,due:p.due,status:'cancelled'});assert.throws(()=>acceptProposal(s,p.id,1));
});
test('intake reuses client identities, supports repeat projects, and deduplicates submission retries',()=>{
 const s=seed(),d={name:'Juniper Studio',contact:'Sophie',email:'SOPHIE@JUNIPER.EXAMPLE',project:'New engagement',scope:'New scope',budget:300000,due:'2026-11-30'};const before=s.clients.length,p=submitInquiry(s,d,'one');assert.equal(s.clients.length,before);assert.equal(p.clientId,'c1');assert.equal(submitInquiry(s,d,'one').id,p.id);const other=submitInquiry(s,d,'two');assert.notEqual(other.id,p.id);assert.equal(s.clients.length,before);
});
test('invalid intake leaves no orphan client and an unpriced inquiry cannot be published',()=>{
 const s=seed(),before=JSON.stringify(s),d={name:'New client',contact:'New person',email:'new@example.com',project:'New project',scope:'Scope',budget:-10};assert.throws(()=>submitInquiry(s,d,'invalid'));assert.equal(JSON.stringify(s),before);const p=submitInquiry(s,{...d,budget:''},'valid');assert.equal(p.needsPricing,true);assert.equal(p.budget,0);assert.throws(()=>publishProposal(s,p.id));
});
test('intake additional question honors required setting',()=>{
 const s=seed();saveIntake(s,{...s.intake,question:'What is your goal?',questionRequired:true});assert.throws(()=>submitInquiry(s,{name:'New',contact:'New',email:'a@example.com',project:'New',scope:'Scope'},'x'));
});
test('migration preserves v1 records and already issued invoices without re-billing them',()=>{
 const old=baseSeed();old.clients[0].name='User renamed client';const count=old.invoices.length,paid=old.invoices.reduce((a,i)=>a+i.paid,0);const s=migrate(old);assert.equal(s.version,2);assert.equal(s.clients[0].name,'User renamed client');assert.equal(s.invoices.length,count);assert.equal(s.invoices.reduce((a,i)=>a+i.paid,0),paid);assert.equal(migrate(s),s);const p=s.projects.find(p=>p.id==='p1');const phase=p.billingPlan.find(r=>r.id==='i4-rule').phaseId;approveMilestone(s,p.id,phase);assert.equal(s.invoices.length,count);
});

test('fully paid legacy projects remain editable and reopen as completed',()=>{
 const s=seed(),p=s.projects.find(p=>p.id==='p3');
 updateProject(s,p.id,{name:'Updated name',service:p.service,due:p.due,status:'completed'});
 assert.equal(p.name,'Updated name');
 updateProject(s,p.id,{name:p.name,service:p.service,due:p.due,status:'cancelled'});
 reopenProject(s,p.id);assert.equal(p.status,'completed');
});
