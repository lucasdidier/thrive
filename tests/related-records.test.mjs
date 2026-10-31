import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {createJourneyUI} from '../public/journey-ui.js';
import {createCommunicationsUI} from '../public/communications-ui.js';
import {hoursMinutes} from '../public/related-list.js';

const setup=()=>initBilling(upgradeWorkspace(seed()));
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const context=s=>({getState:()=>s,esc,icon:()=>'',btn:(label,action)=>`<button data-action="${action}">${label}</button>`,badge:(status,label)=>`<span>${label||status}</span>`,date:String,avatar:()=>'',customFields:{properties:()=>''},recordPanel:{identity:()=>'',field:()=>'',statusControl:()=>''},projectEmailCount:()=>0});

test('project invoice totals exclude drafts and retain record currency',()=>{
 const s=setup(),p=s.projects[0];p.currency='EUR';
 s.invoices=[{id:'issued',number:'INV-QA',projectId:p.id,currency:'EUR',amount:10000,paid:2500,due:'2099-01-01'}];
 s.invoiceDrafts=[{id:'draft',title:'Unissued work',projectId:p.id,clientId:p.clientId,currency:'EUR',items:[{description:'Design',quantity:1,rate:50000}]}];
 const html=createJourneyUI(context(s)).page(p.id,'invoices');
 assert.match(html,/Invoices<span class="tab-count">2<\/span>/);
 assert.match(html,/Invoiced <strong>€100<\/strong>/);
 assert.match(html,/Collected <strong>€25<\/strong>/);
 assert.match(html,/Outstanding <strong>€75<\/strong>/);
 assert.match(html,/Unissued work/);assert.match(html,/Draft · not issued yet/);
});

test('project email counts and rows deduplicate delivered drafts represented by conversations',async t=>{
 const oldDocument=globalThis.document;globalThis.document={addEventListener(){}};
 t.after(()=>{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
 const s=setup(),p=s.projects[0],date='2026-10-30T10:00:00Z';
 s.emailDrafts=[{id:'sent',projectId:p.id,subject:'Sent draft',updatedAt:date},{id:'unsent',projectId:p.id,subject:'Next update',updatedAt:date}];
 t.mock.method(globalThis,'fetch',async()=>Response.json({connection:{account:null},threads:[{id:'abc',projectId:p.id,subject:'Delivered conversation',updatedAt:date,messages:[{id:'m1',direction:'outgoing',to:'client@example.com',date}]}],operations:[{id:'email:sent',status:'sent',threadId:'abc'}]}));
 const ui=createCommunicationsUI({...context(s),getPage:()=>'',render:()=>{}});await ui.load();
 assert.equal(ui.projectEmailCount(p),2);
 const activity=ui.projectEmailActivity(p);assert.equal(activity.length,1);assert.equal(activity[0].text,'Email sent');assert.equal(activity[0].at,date);assert.equal(activity[0].id,'abc');assert.deepEqual(ui.projectEmailActivity({id:'other-project'}),[]);
 const html=ui.projectEmails(p);
 assert.match(html,/Delivered conversation/);assert.match(html,/Next update/);
 assert.doesNotMatch(html,/Sent draft/);assert.match(html,/>Sent<\/span>/);
 assert.equal((html.match(/class="rel-row"/g)||[]).length,2);
});

test('time durations express hours and minutes without a clock-like colon',()=>{
 assert.equal(hoursMinutes(1110),'18h 30m');assert.equal(hoursMinutes(60),'1h');
 assert.equal(hoursMinutes(45),'45m');assert.equal(hoursMinutes(0),'0m');
 assert.equal(hoursMinutes(119.6),'2h');assert.equal(hoursMinutes(-10),'0m');
});
