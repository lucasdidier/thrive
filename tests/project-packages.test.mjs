import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,createProject,updateProject} from '../public/domain.js';
import {upgradeWorkspace,createDocument,saveDocument,publishDocument,respondDocument} from '../public/workspace-domain.js';
import {defaultProjectStatuses,saveProjectStatuses,projectStatus} from '../public/project-status.js';
import {upgradeProjects} from '../public/project-migration.js';
import {applySelectionMode,quoteOffers,validateOffers} from '../public/services-domain.js';
import {workspaceBranding,refreshDraftBranding} from '../public/workspace-branding.js';
import {invoiceDefaults,validateInvoiceDefaults} from '../public/invoice-defaults.js';
import {clientProjection} from '../server/sharing.mjs';
import {saveWorkflow} from '../public/workflow-domain.js';
const setup=()=>upgradeWorkspace(seed());
const line=(id,rate,quantity=1)=>({id,name:id,rate,quantity,min:quantity,max:quantity,mode:'required',unit:'item',billingModel:'fixed',group:''});
const pkg=(id,items,taxRate=0)=>({id,name:id,packageItems:items,taxRate});
test('packages calculate child quantities and tax, enforce single selection, and sum multi-selection',()=>{
 const raw=[pkg('Website',[line('Backend',50000),line('Frontend',100000)],10),pkg('App',[line('Design',125000,2)])];
 const offers=validateOffers(applySelectionMode(raw,'single'));
 assert.equal(offers[0].subtotal,150000);assert.equal(offers[0].taxAmount,15000);assert.equal(offers[0].rate,165000);
 assert.equal(quoteOffers(offers).amount,165000);
 assert.throws(()=>quoteOffers(offers,offers.map(o=>({id:o.id,quantity:1}))),/exactly one/);
 const multi=applySelectionMode(offers,'multiple');assert.equal(quoteOffers(multi,multi.map(o=>({id:o.id,quantity:1}))).amount,415000);
 assert.equal(quoteOffers(applySelectionMode(offers,'fixed')).amount,415000);
 assert.throws(()=>validateOffers(applySelectionMode([pkg('Nested',[pkg('Inner',[line('A',100)])])],'fixed')),/cannot contain/);
});
test('time-priced package children produce estimates and ignore a tampered package total',()=>{
 const offers=applySelectionMode([pkg('Consulting',[{...line('Advice',10000,2),unit:'hour',billingModel:'time'}],5)],'fixed');
 offers[0].rate=1;const q=quoteOffers(offers);assert.equal(q.amount,21000);assert.equal(q.estimated,true);
});
test('custom status labels persist while identifiers remain stable and workflows accept custom statuses',()=>{
 const s=setup(),custom=[...structuredClone(defaultProjectStatuses),{id:'on-hold',name:'On hold',color:'#bb9900'}];custom[1].name='Doing';saveProjectStatuses(s,custom);
 const p=createProject(s,{clientId:s.clients[0].id,name:'Status test',budget:10000});updateProject(s,p.id,{...p,status:'on-hold'});
 assert.equal(projectStatus(s,p).name,'On hold');assert.throws(()=>saveProjectStatuses(s,defaultProjectStatuses),/Move projects/);
 const w=saveWorkflow(s,{name:'Status',enabled:false,triggers:[{type:'project.status_changed',filter:{value:'on-hold'}}],steps:[{type:'project.status',targetId:p.id,config:{status:'on-hold'}}]});assert.equal(w.steps[0].config.status,'on-hold');
 assert.equal(projectStatus(JSON.parse(JSON.stringify(s)),p).name,'On hold');
});
test('migration removes live delivery phases without rewriting historical agreements or creating invoices',()=>{
 const s=setup(),p=s.projects[0];p.status='inquiry';p.phases=[{id:'old'}];p.billingPlan=[{id:'a',phaseId:'old',amount:100},{id:'b',phaseId:'next',amount:100}];p.versions=[{number:1,phases:[{id:'old'}],billingPlan:[{phaseId:'old'}]}];s.settings.phases=['Old'];
 const history=structuredClone(p.versions),invoices=structuredClone(s.invoices);upgradeProjects(s);assert.equal(p.status,'planned');assert.equal(p.phases,undefined);assert.equal(s.settings.phases,undefined);assert.deepEqual(p.billingPlan.map(r=>r.trigger),['acceptance','manual']);assert.deepEqual(p.versions,history);assert.deepEqual(s.invoices,invoices);const again=structuredClone(s);upgradeProjects(s);assert.deepEqual(s,again);
});
test('workspace branding refreshes drafts and preserves published and issued snapshots',()=>{
 const s=setup();s.settings.documentDesign={...s.settings.documentDesign,color:'#aa5533',footer:'New footer'};s.invoiceDrafts=[{id:'test',design:{template:'compact',color:'#112233'}}];
 const d=s.documents.find(d=>d.status==='draft'),oldVersions=structuredClone(s.documents.map(d=>d.versions)),oldInvoices=structuredClone(s.invoices);refreshDraftBranding(s);
 assert.equal(d.design.color,'#aa5533');assert.equal(s.invoiceDrafts[0].design.color,'#aa5533');assert.equal(s.invoiceDrafts[0].design.template,'compact');assert.deepEqual(s.documents.map(d=>d.versions),oldVersions);assert.deepEqual(s.invoices,oldInvoices);assert.equal(workspaceBranding(s,{color:'#000000'}).color,'#aa5533');
});
test('public package projection exposes pricing but strips catalog IDs and private fields',()=>{
 const s=setup(),d=s.documents[0];const offer=validateOffers(applySelectionMode([pkg('Package',[line('Service',10000)])],'fixed'))[0];offer.packageItems[0].serviceId='private-catalog-id';offer.packageItems[0].notes='private';d.versions=[{number:1,showPricing:true,offers:[offer],agreedItems:[offer],client:{name:'Client'},status:'published'}];d.currentVersion=1;d.status='published';
 const data=clientProjection(s,{entity:'document',recordId:d.id,version:1}).data;assert.equal(data.offers[0].packageItems[0].rate,10000);assert.equal(JSON.stringify(data).includes('private'),false);
});
test('invoice defaults are bounded, persist as numbers, and retain the existing fallback',()=>{
 assert.deepEqual(invoiceDefaults({settings:{}}),{dueDays:14,taxRate:0});assert.deepEqual(validateInvoiceDefaults({dueDays:'30',taxRate:'7.25'}),{dueDays:30,taxRate:7.25});for(const v of [{dueDays:-1,taxRate:0},{dueDays:30,taxRate:101},{dueDays:1.5,taxRate:0}])assert.throws(()=>validateInvoiceDefaults(v));
});
test('selected package survives save, publication, acceptance and deposit billing with exact tax-inclusive totals',()=>{
 const s=setup(),p=createProject(s,{clientId:'c1',name:'Package lifecycle',budget:100000}),d=createDocument(s,{clientId:'c1',projectId:p.id,kind:'proposal',title:'Package options'});
 saveDocument(s,d.id,{...d,scope:'Choose a delivery package.',selectionMode:'single',offers:[pkg('Website',[line('Development',100000)],10),pkg('Website-and-app',[line('Development',100000),line('App',200000)],10)],rules:d.billingPlan});
 const v=publishDocument(s,d.id);respondDocument(s,d.id,v.number,'accept',{selections:[{id:'Website-and-app',quantity:1}]});
 const saved=s.documents.find(x=>x.id===d.id),project=s.projects.find(x=>x.id===p.id);assert.equal(saved.versions[0].agreedItems[0].packageItems.length,2);assert.equal(project.budget,330000);assert.equal(project.billingPlan.reduce((n,x)=>n+x.amount,0),330000);assert.equal(s.invoices.find(i=>i.projectId===p.id).amount,165000);
 const count=s.invoices.length;respondDocument(s,d.id,v.number,'accept',{selections:[{id:'Website',quantity:1}]});assert.equal(s.invoices.length,count);assert.equal(s.documents.find(x=>x.id===d.id).versions[0].budget,330000);
});
test('the workspace logo is the branding source and explicit removal reaches drafts only',()=>{
 const s=setup(),oldInvoices=structuredClone(s.invoices),oldVersions=structuredClone(s.documents.map(d=>d.versions));
 s.settings.documentDesign={...s.settings.documentDesign,logo:'data:image/png;base64,old'};
 s.settings.workspaceLogo='data:image/png;base64,new';
 s.invoiceDrafts=[{id:'draft',design:{template:'compact'}}];
 refreshDraftBranding(s);
 assert.equal(workspaceBranding(s).logo,s.settings.workspaceLogo);
 assert.equal(s.invoiceDrafts[0].design.logo,s.settings.workspaceLogo);
 s.settings.workspaceLogo='';refreshDraftBranding(s);
 assert.equal(s.invoiceDrafts[0].design.logo,'');
 assert.equal(s.documents.find(d=>d.status==='draft').design.logo,'');
 assert.deepEqual(s.invoices,oldInvoices);assert.deepEqual(s.documents.map(d=>d.versions),oldVersions);
});
