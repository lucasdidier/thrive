import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {projectActivity} from '../public/project-activity.js';
import {createJourneyUI} from '../public/journey-ui.js';

const fresh=()=>initBilling(upgradeWorkspace(seed()));
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const context=s=>({getState:()=>s,esc,icon:()=>'',avatar:()=>'',btn:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,badge:(status)=>`<span>${status}</span>`,date:String,recordPanel:{statusControl:()=>'',field:()=>''},customFields:{properties:()=>''},projectEmailCount:()=>0});

test('project activity isolates same-client projects, orders timestamps and preserves record currency',()=>{
 const s=fresh();s.documents=[];s.time=[];s.invoices=[];s.activity=[];
 s.documents=[{id:'d1',projectId:'p1',clientId:'c1',title:'Scope',createdAt:'2026-01-01',versions:[{number:1,title:'Original scope',createdAt:'2026-01-02T14:00:00Z',completedAt:'2026-01-03T10:00:00Z',status:'signed'}]},
  {id:'d2',projectId:'p2',clientId:'c1',title:'Private to another project',createdAt:'2026-01-08',versions:[]}];
 s.invoices=[{id:'i1',projectId:'p1',number:'INV-1',currency:'EUR',amount:10000,issued:'2026-01-04',payments:[{amount:2500,date:'2026-01-05',method:'Bank transfer'}]}];
 s.time=[{id:'t1',projectId:'p1',date:'2026-01-06',minutes:90,note:'Design'}];
 const before=JSON.stringify(s),events=projectActivity(s,'p1');
 assert.equal(events.length,6);assert.equal(events[0].text,'Time logged');assert.equal(events[0].detail,'1h 30m · Design');
 assert.match(events.find(e=>e.text==='Issued INV-1').detail,/€100/);
 assert.match(events.find(e=>e.text.startsWith('Payment')).detail,/€25/);
 assert.ok(events.some(e=>e.text==='Signed Original scope'));
 assert.ok(!events.some(e=>e.text.includes('Private')));assert.equal(JSON.stringify(s),before);
});

test('activity includes each project record type and skips undated legacy events',()=>{
 const s={settings:{currency:'USD'},projects:[],documents:[],invoices:[],time:[],
  forms:[{id:'f',projectId:'p',name:'Brief',createdAt:'2026-01-01'}],
  submissions:[{id:'s',projectId:'p',formTitle:'Brief',createdAt:'2026-01-02'}],
  emailDrafts:[{id:'e',projectId:'p',subject:'Hello',createdAt:'2026-01-03'}],
  invoiceDrafts:[{id:'i',projectId:'p',title:'Design work',createdAt:'2026-01-04'}],
  scheduling:{meetings:[{id:'m',projectId:'p',typeName:'Discovery',createdAt:'2026-01-05',completedAt:'2026-01-06'}]},
  activity:[{projectId:'p',text:'Updated project',createdAt:'2026-01-07'},{projectId:'p',text:'Unknown date'},{projectId:'p',text:'Bad date',createdAt:'invalid'}]};
 const events=projectActivity(s,'p');assert.equal(events.length,7);
 assert.deepEqual(new Set(events.map(e=>e.action)),new Set(['edit-form','submission','mail-edit','invoice','meeting',null]));
 assert.equal(events[0].text,'Updated project');assert.deepEqual(projectActivity(s,'other'),[]);
});

test('overview puts summaries before creation and history, passes context, and retains billing in invoices',()=>{
 const s=fresh(),p=s.projects[0],ui=createJourneyUI(context(s)),html=ui.page(p.id);
 assert.ok(html.indexOf('Project summary')<html.indexOf('Create in project'));
 assert.ok(html.indexOf('project-activity-title')<html.indexOf('Create in project'));
 assert.match(html,/<header class="project-activity-header">/);
 for(const action of ['log-time','new-proposal','new-contract','new-invoice','new-document','mail-new','new-form','booking-preview']){
  assert.match(html,new RegExp(`data-action="${action}" data-client="${p.clientId}" data-project="${p.id}"`));
 }
 assert.doesNotMatch(html,/Waiting for the client|Billing schedule|View time entries/);
 assert.match(ui.page(p.id,'invoices'),/Billing schedule/);
 for(const closed of ['archived','cancelled','client']){
  p.archived=closed==='archived';p.status=closed==='cancelled'?'cancelled':'active';s.clients.find(c=>c.id===p.clientId).archived=closed==='client';
  assert.doesNotMatch(ui.page(p.id),/class="record-create project-create"/);
 }
});

test('overview escapes activity text and presents a useful empty state',()=>{
 const s=fresh(),p=s.projects[0];s.documents=[];s.time=[];s.invoices=[];s.activity=[];
 const ui=createJourneyUI(context(s));assert.match(ui.page(p.id),/No activity yet/);
 s.emailDrafts=[{id:'e',projectId:p.id,createdAt:'2026-01-01',subject:'<img src=x onerror=alert(1)>'}];
 assert.match(ui.page(p.id),/&lt;img/);assert.doesNotMatch(ui.page(p.id),/<img src=x/);
});
