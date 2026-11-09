import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyWorkspace} from '../server/account-workspace.mjs';
import {validateWorkspace} from '../server/validation.mjs';
import {needsOnboarding,saveOnboardingProfile,chooseVertical,addStarterService,enableStarterWorkflow,recommendedWorkflows,completeOnboarding,suggestedCurrency} from '../public/onboarding-domain.js';
import {starterServices} from '../public/catalog-starters.js';
import {saveService} from '../public/services-domain.js';
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
 // Services: two suggestions, one with an edited price
 const [first,second]=starterServices('design');
 for(const [preset,price] of [[first,1500],[second,null]]){
  const svc=addStarterService(s,preset.starterKey);
  if(price!==null){const updated=saveService(s,{...svc,items:[{...svc.items[0],rate:price*100}]},svc.id);updated.starterKey=preset.starterKey;}
 }
 completeGettingStarted(s,'services');
 // Clients, connection skipped, workflows
 saveClient(s,{type:'company',name:'Juniper Studio',contact:'Ana',email:'ana@juniper.test'});
 completeGettingStarted(s,'clients');
 skipGettingStarted(s,'connections');
 const flows=recommendedWorkflows('design').slice(0,2);
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
