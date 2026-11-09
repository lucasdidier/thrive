import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyWorkspace} from '../server/account-workspace.mjs';
import {validateWorkspace} from '../server/validation.mjs';
import {needsOnboarding,saveOnboardingProfile,chooseVertical,enableStarterWorkflow,recommendedWorkflows,starterWorkflow,completeOnboarding,suggestedCurrency,onboardingServiceRows,saveOnboardingServices} from '../public/onboarding-domain.js';
import {verticals} from '../public/catalog-starters.js';
import {snapshotWorkspace,runWorkflows} from '../public/workflow-domain.js';
import {createDocument,publishDocument,respondDocument} from '../public/workspace-domain.js';
import {createManualInvoice} from '../public/invoice-domain.js';
import {createProject,recordPayment} from '../public/domain.js';
import {starterServices} from '../public/catalog-starters.js';
import {saveClient} from '../public/domain.js';
import {completeGettingStarted,skipGettingStarted,gettingStartedProgress} from '../public/getting-started.js';
import {onboardingSteps,resumeStep} from '../public/onboarding-ui.js';
import {dashboardGreeting} from '../public/dashboard-domain.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const fresh=()=>emptyWorkspace({name:'Sam',email:'sam@example.test'});

test('onboarding asks about you, the business, the four checklist steps, then where to start',()=>{
 assert.deepEqual(onboardingSteps,['you','business','services','clients','connect','workflows','start']);
});

test('onboarding resumes where the person left it',()=>{
 const s=fresh();
 assert.equal(resumeStep(s),'you','a new account starts with the name and photo, even with a name from Google');
 s.settings.onboarding.setupStep='business';
 assert.equal(resumeStep(s),'business','after "you", a reload returns to the business questions');
 saveOnboardingProfile(s,{name:'Sam Rivera',businessName:'',country:'PT',currency:'EUR'});
 assert.equal(resumeStep(s),'business');
 chooseVertical(s,'design');
 assert.equal(resumeStep(s),'services');
 for(const step of ['clients','connect','workflows','start']){s.settings.onboarding.setupStep=step;assert.equal(resumeStep(s),step);}
 s.settings.onboarding.setupStep='bogus';
 assert.equal(resumeStep(s),'services');
});

test('country suggests the currency, with US dollars as the fallback',()=>{
 assert.equal(suggestedCurrency('PT'),'EUR');assert.equal(suggestedCurrency('GB'),'GBP');assert.equal(suggestedCurrency('US'),'USD');
});

test('a full onboarding run saves a valid workspace and ticks the Getting started checklist',()=>{
 const s=fresh(),before=structuredClone(s);
 // You + business
 s.settings.name='Sam Rivera';
 saveOnboardingProfile(s,{name:'Sam Rivera',businessName:'Rivera Studio',country:'PT',currency:'EUR'});
 chooseVertical(s,'design');
 s.settings.onboarding={...s.settings.onboarding,setupStep:'services'};
 validateWorkspace(s,before);
 // Services: the first two suggestions (one repriced) and nothing else
 const [first]=starterServices('design');
 const rows=onboardingServiceRows(s,'design');rows.forEach((r,i)=>r.on=i<2);rows[0].rate=150000;
 assert.equal(saveOnboardingServices(s,rows),2);
 completeGettingStarted(s,'services');
 // Clients, connection skipped, workflows
 saveClient(s,{type:'company',name:'Juniper Studio',contact:'Ana',email:'ana@juniper.test'});
 completeGettingStarted(s,'clients');
 skipGettingStarted(s,'connections');
 const flows=recommendedWorkflows('design').filter(f=>f.on).slice(0,2);
 flows.forEach(f=>enableStarterWorkflow(s,f.key));
 completeGettingStarted(s,'workflows');
 s.settings.onboarding={...s.settings.onboarding,setupStep:'start'};
 completeOnboarding(s);
 validateWorkspace(s,before);

 assert.equal(needsOnboarding(s),false);
 assert.equal(s.settings.business,'Rivera Studio');assert.equal(s.settings.currency,'EUR');assert.equal(s.settings.vertical,'design');
 assert.equal(s.services.length,2);
 assert.equal(s.services.find(x=>x.starterKey===first.starterKey).items[0].rate,150000);
 assert.ok(s.services.every(x=>x.currency==='EUR'));
 assert.deepEqual(s.clients.map(c=>c.name),['Juniper Studio']);
 assert.equal(s.automation.workflows.filter(w=>w.enabled).length,2);
 const status=Object.fromEntries(gettingStartedProgress(s,null).map(x=>[x.id,x.status]));
 for(const id of ['services','clients','workflows'])assert.equal(status[id],'complete',id);
 assert.equal(status.connections,'skipped');
});

test('suggested services can be renamed, repriced, re-unit-ed, added to and unticked, and saving twice never duplicates',()=>{
 const s=fresh();saveOnboardingProfile(s,{name:'Sam',businessName:'',country:'PT',currency:'EUR'});chooseVertical(s,'product');
 const rows=onboardingServiceRows(s,'product');
 assert.equal(rows.filter(r=>r.on).length,3,'the first three suggestions start ticked');
 assert.ok(rows.every(r=>r.starterKey&&!r.id));
 Object.assign(rows[0],{name:'UX review',rate:90000});
 Object.assign(rows[1],{unit:'day',rate:80000});
 rows[2].on=false;
 rows.push({key:'new-1',id:'',starterKey:'',name:'Design system audit',unit:'item',rate:250000,on:true});
 assert.equal(saveOnboardingServices(s,rows),3);
 const names=s.services.map(x=>x.name).sort();
 assert.deepEqual(names,['Design system audit','UX review',rows[1].name].sort());
 const renamed=s.services.find(x=>x.name==='UX review');
 assert.equal(renamed.items[0].rate,90000);assert.equal(renamed.items[0].description,'UX review');assert.equal(renamed.starterKey,rows[0].starterKey);
 const daily=s.services.find(x=>x.id===rows[1].id);assert.equal(daily.unit,'day');assert.equal(daily.billingModel,'time');
 assert.ok(rows.filter(r=>r.on).every(r=>r.id),'saved rows get their service id back');
 validateWorkspace(s);
 // Saving again, or coming Back to the step, shows and updates the same services
 assert.equal(saveOnboardingServices(s,rows),3);assert.equal(s.services.length,3);
 const again=onboardingServiceRows(s,'product');
 assert.deepEqual(again.filter(r=>r.on).map(r=>r.name).sort(),names);
 // Unticking a saved service archives it; ticking it back restores it
 again.find(r=>r.name==='Design system audit').on=false;saveOnboardingServices(s,again);
 assert.equal(s.services.find(x=>x.name==='Design system audit').archived,true);
 again.find(r=>r.name==='Design system audit').on=true;saveOnboardingServices(s,again);
 assert.equal(s.services.find(x=>x.name==='Design system audit').archived,false);
 validateWorkspace(s);
});

test('a kept service needs a name and a price; nothing is saved until every row is valid',()=>{
 const s=fresh();saveOnboardingProfile(s,{name:'Sam',businessName:'',country:'PT',currency:'EUR'});chooseVertical(s,'general');
 for(const change of [{name:'  '},{rate:0},{unit:'year'},{name:'x'.repeat(101)}]){
  const rows=onboardingServiceRows(s,'general');Object.assign(rows[1],change);
  assert.throws(()=>saveOnboardingServices(s,rows));assert.equal(s.services.length,0);
 }
});

test('each business type suggests six workflows with icons, three of them on, and all of them run',()=>{
 for(const v of Object.keys(verticals)){const list=recommendedWorkflows(v);assert.equal(list.length,6,v);assert.equal(list.filter(f=>f.on).length,3,v);assert.equal(new Set(list.map(f=>f.key)).size,6,v);assert.ok(list.every(f=>f.icon&&f.name&&f.description),v);}
 assert.deepEqual(recommendedWorkflows('design').filter(f=>f.on).map(f=>f.key),['proposal-contract','contract-start','paid-thanks']);
 assert.deepEqual(recommendedWorkflows('coaching').filter(f=>f.on).map(f=>f.key),['meeting-followup','inquiry','paid-thanks']);
 const setup=v=>{const s=fresh();saveOnboardingProfile(s,{name:'Sam',businessName:'',country:'PT',currency:'EUR'});chooseVertical(s,v);const c=saveClient(s,{name:'Juniper',contact:'Ana',email:'ana@juniper.test'});const p=createProject(s,{clientId:c.id,name:'Rebrand',budget:100000,due:'2027-01-01'});return {s,c,p};};
 const fire=(s,key,act)=>{enableStarterWorkflow(s,key);const before=snapshotWorkspace(s);act();assert.equal(runWorkflows(s,before),1,key);validateWorkspace(s);};
 // Accepted proposal -> contract draft for the same client and project
 let {s,c,p}=setup('design');const doc=createDocument(s,{clientId:c.id,projectId:p.id,title:'Rebrand proposal',kind:'proposal'});doc.scope='Scope';publishDocument(s,doc.id);
 fire(s,'proposal-contract',()=>respondDocument(s,doc.id,doc.versions.at(-1).number,'accept'));
 const contract=s.documents.find(d=>d.kind==='contract');assert.equal(contract.title,'Agreement with Juniper');assert.equal(contract.projectId,p.id);
 // Paid invoice -> thank-you email draft, never sent
 ({s,c}=setup('design'));const inv=createManualInvoice(s,{clientId:c.id,issued:'2026-11-09',due:'2026-12-09',items:[{description:'Work',quantity:1,rate:50000}],taxRate:0},'k1');
 fire(s,'paid-thanks',()=>recordPayment(s,inv.id));
 assert.equal(s.emailDrafts.length,1);assert.match(s.emailDrafts[0].body,/Hi Ana/);assert.notEqual(s.emailDrafts[0].status,'sent');
 // Completed project -> testimonial request draft
 ({s,p}=setup('design'));fire(s,'project-review',()=>{s.projects.find(x=>x.id===p.id).status='completed';});
 assert.match(s.emailDrafts[0].subject,/Rebrand/);
 // An edited starter keeps its edits when onboarding turns it on
 ({s}=setup('general'));const w=enableStarterWorkflow(s,'new-client');w.name='Tag new clients';w.enabled=false;
 assert.equal(enableStarterWorkflow(s,'new-client').name,'Tag new clients');assert.equal(starterWorkflow(s,'new-client').enabled,true);
});

test('every business type, including Other, gets its own suggested services',()=>{
 const other=starterServices('general').map(x=>x.name);
 assert.equal(other.length,5);
 assert.notDeepEqual(starterServices('design').map(x=>x.name),other);
 assert.notDeepEqual(starterServices('web').map(x=>x.name),starterServices('design').map(x=>x.name));
});

test('the dashboard never greets the placeholder name',()=>{
 const morning=new Date(2026,10,9,9);
 assert.equal(dashboardGreeting('Your name',morning).includes('Your'),false);
 assert.match(dashboardGreeting('Sam Rivera',morning),/Sam/);
});

test('the app shows onboarding before the workspace until it is finished',()=>{
 const app=read('../public/app.js'),html=read('../ui/index.html'),ui=read('../public/onboarding-ui.js');
 assert.match(app,/import \{createOnboardingUI\} from '\.\/onboarding-ui\.js'/);
 assert.match(app,/if\(onboarding\?\.active\(\)\)\{onboarding\.show\(\);return;\}/);
 assert.match(html,/href="\/onboarding\.css"/);
 for(const kind of ['invoice','proposal','contract','workspace'])assert.ok(ui.includes(`data-kind="${kind}"`)||ui.includes(`'${kind}'`),kind);
});

test('the title font is a dropdown that previews each font, not a grid of cards',()=>{
 const settings=read('../public/settings-page.js'),bridge=read('../fluid/bridge.tsx');
 assert.match(settings,/<label class="field">Title font<select name="titleFont">/);
 assert.doesNotMatch(settings,/title-font-option/);
 assert.doesNotMatch(read('../public/workspace-design.css'),/title-font-option/);
 assert.match(bridge,/font: o\.style\.fontFamily/);
});
