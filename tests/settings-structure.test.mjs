import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationSettings,validateNotificationSettings} from '../public/notification-settings.js';
import {documentDefaults,validateDocumentDefaults} from '../public/document-defaults.js';
import {buildSummary,summaryDue,localClock} from '../public/summary-domain.js';
import {currencies,defaultHourlyRate,billingCurrencies} from '../public/currency.js';
import {verticals,verticalIcons,starterServices} from '../public/catalog-starters.js';
import {countries} from '../public/onboarding-domain.js';
import {hourlyRate} from '../public/time-domain.js';
import {settingsSections,settingsSection} from '../public/settings-page.js';
import {sendOwnerNotification} from '../server/nylas.mjs';
import {notifyDocumentResponse} from '../server/form-notifications.mjs';

const base=()=>({settings:{business:'Studio',currency:'EUR',hourlyRate:9000},clients:[{id:'c1',name:'Forma'}],projects:[],documents:[],invoices:[],time:[],submissions:[],scheduling:{timeZone:'Europe/Lisbon',meetings:[]}});

test('settings are grouped without the duplicate Scheduling or Invoice templates pages',()=>{
 const ids=settingsSections.map(s=>s.id);
 assert.ok(!ids.includes('scheduling')&&!ids.includes('invoices'));
 for(const id of ['proposals','contracts','billing','notifications'])assert.ok(ids.includes(id));
 assert.equal(settingsSections.find(s=>s.id==='notifications').group,'Personal');
 assert.equal(settingsSection('#settings/invoices').id,'invoice-defaults');
 assert.equal(settingsSection('#settings/project-statuses').id,'rates');
});
test('business types cover common service businesses, each with an icon and starter services, ending with Other',()=>{
 const keys=Object.keys(verticals);
 assert.ok(keys.length>=11&&keys.length<=16);assert.equal(keys.at(-1),'general');assert.equal(verticals.general,'Other');
 for(const k of keys){assert.ok(verticalIcons[k]);assert.ok(starterServices(k).length>=4);}
});
test('every active currency is available and countries lead with their flag',()=>{
 assert.ok(Object.keys(currencies).length>150);assert.ok(currencies.JPY&&currencies.XOF&&currencies.EUR);
 assert.deepEqual(countries.find(c=>c[0]==='PT'),['PT','🇵🇹 Portugal']);
});
test('each billing currency has its own default hourly rate',()=>{
 const s=base();s.settings.currencyRates={USD:12000};
 assert.deepEqual(billingCurrencies(s),['EUR','USD']);
 assert.equal(defaultHourlyRate(s,'EUR'),9000);assert.equal(defaultHourlyRate(s,'USD'),12000);assert.equal(defaultHourlyRate(s,'GBP'),9000);
 assert.equal(hourlyRate(s,{currency:'USD'}),12000);assert.equal(hourlyRate(s,{currency:'USD',hourlyRate:5000}),5000);
});
test('notification settings default on, keep the legacy form toggle, and reject unknown keys',()=>{
 const s=base();s.settings.formEmailNotifications=false;
 const n=notificationSettings(s);assert.equal(n.instant.formResponse,false);assert.equal(n.instant.documentAccepted,true);assert.equal(n.summary,'daily');
 assert.throws(()=>validateNotificationSettings({...n,instant:{...n.instant,spam:true}}));
 assert.throws(()=>validateNotificationSettings({...n,summary:'hourly'}));
 assert.doesNotThrow(()=>validateNotificationSettings(n));
});
test('document defaults fall back to the kind’s usual response and validate templates',()=>{
 const s=base();assert.equal(documentDefaults(s,'contract').responseMode,'signature');
 s.settings.documentDefaults={proposal:{templateId:'package-proposal',responseMode:'signature',terms:'Net 14.'}};
 assert.deepEqual(documentDefaults(s,'proposal'),{templateId:'package-proposal',responseMode:'signature',terms:'Net 14.'});
 assert.throws(()=>validateDocumentDefaults({proposal:{templateId:'retainer',responseMode:'acceptance',terms:''}}));
});
test('summary goes out at 8:00 local time and lists what needs attention',()=>{
 const s=base(),now=new Date('2026-11-05T08:10:00Z');
 assert.equal(localClock(now,'Europe/Lisbon').hour,8);
 assert.deepEqual(summaryDue(s,now),{frequency:'daily',date:'2026-11-05'});
 assert.equal(summaryDue(s,new Date('2026-11-05T09:10:00Z')),null);
 assert.equal(buildSummary(s,{now}),null);
 s.invoices.push({id:'i1',number:'INV-9',clientId:'c1',issued:'2026-10-01',due:'2026-10-15',amount:50000,paid:0,currency:'EUR'});
 const msg=buildSummary(s,{now,origin:'https://thrive.example'});
 assert.match(msg.body,/Overdue invoices\n· INV-9 · Forma · €500/);assert.match(msg.body,/thrive.example\/#invoices/);
 s.settings.notifications={...notificationSettings(s),sections:{...notificationSettings(s).sections,overdueInvoices:false}};
 assert.equal(buildSummary(s,{now}),null);
});
function memoryDb(){const rows=new Map();return {rows,prepare:sql=>({bind:(...a)=>({first:async()=>rows.get(a[0]+'|'+a[1])||null,run:async()=>{if(sql.startsWith('INSERT')){const k=a[0]+'|'+a[1];if(rows.has(k))return {meta:{changes:0}};rows.set(k,{status:a[3],result:a[4]});return {meta:{changes:1}};}const k=a[3]+'|'+a[4];rows.set(k,{status:a[0],result:a[1]});return {meta:{changes:1}};}})})};}
test('owner notifications use Thrive’s own sender when configured and deliver once',async()=>{
 const db=memoryDb(),calls=[];const fetcher=async(url,init)=>{calls.push([url,JSON.parse(init.body)]);return new Response(JSON.stringify({id:'em_1'}),{status:200});};
 const env={RESEND_API_KEY:'test',THRIVE_NOTIFICATIONS_FROM:'Thrive <hello@example.com>'};
 const r=await sendOwnerNotification(db,'owner',env,'summary:daily:2026-11-05','owner@example.com',{subject:'Your day',body:'Hi'},fetcher);
 assert.equal(r.status,'sent');assert.equal(calls[0][0],'https://api.resend.com/emails');assert.deepEqual(calls[0][1].to,['owner@example.com']);
 const again=await sendOwnerNotification(db,'owner',env,'summary:daily:2026-11-05','owner@example.com',{subject:'Your day',body:'Hi'},fetcher);
 assert.equal(again.replayed,true);assert.equal(calls.length,1);
});
test('document responses notify only when that preference is on',async()=>{
 const state={...base(),documents:[{id:'d1',kind:'proposal',title:'Brand refresh',clientId:'c1',versions:[{number:1,title:'Brand refresh',response:{name:'Alex'}}]}]};
 const db={kind:'supabase',loadWorkspace:async()=>({state,revision:1})};const sent=[];
 const send=async(_db,_owner,_env,id,to,msg)=>{sent.push([id,msg]);return {status:'sent'};};
 await notifyDocumentResponse(db,'owner','d1',1,'accept',{THRIVE_APP_URL:'https://thrive.example'},{recipient:async()=>'owner@example.com',send});
 assert.equal(sent[0][0],'document-notification:d1:1:accept');assert.match(sent[0][1].subject,/Forma accepted Brand refresh/);
 state.settings.notifications={...notificationSettings(state),instant:{...notificationSettings(state).instant,documentDeclined:false}};
 assert.equal((await notifyDocumentResponse(db,'owner','d1',1,'decline',{THRIVE_APP_URL:'https://thrive.example'},{recipient:async()=>'owner@example.com',send})).status,'disabled');
});
import {allTemplates,saveDocumentTemplate,removeDocumentTemplate,validateDocumentTemplates} from '../public/document-defaults.js';
import {createDocument} from '../public/workspace-domain.js';
import {placeholderFor} from '../public/placeholders.js';
test('templates can be edited, saved as new, reset, and are used when creating documents',()=>{
 const s={...base(),settings:{...base().settings}};
 saveDocumentTemplate(s,{name:'Simple proposal',scope:'Our custom scope',deliverables:'',terms:''},'simple-proposal');
 const edited=allTemplates(s,'proposal').find(t=>t.id==='simple-proposal');assert.equal(edited.scope,'Our custom scope');assert.equal(edited.edited,true);
 const added=saveDocumentTemplate(s,{name:'Brand proposal',scope:'Brand scope',kind:'proposal'},'simple-proposal',{asNew:true});
 assert.notEqual(added.id,'simple-proposal');assert.equal(allTemplates(s,'proposal').length,5);
 assert.doesNotThrow(()=>validateDocumentTemplates(s.settings.documentTemplates));
 const s2={...s,clients:[{id:'c1',name:'Forma',archived:false}],documents:[],projects:[],shareLinks:[],activity:[]};
 const d=createDocument(s2,{clientId:'c1',templateId:added.id,kind:'proposal'});assert.equal(d.scope,'Brand scope');
 removeDocumentTemplate(s,'simple-proposal');assert.equal(allTemplates(s,'proposal').find(t=>t.id==='simple-proposal').edited,false);
 assert.throws(()=>saveDocumentTemplate(s,{name:''},added.id));
});
test('empty fields get an example placeholder from their label and type',()=>{
 const el=(label,type='text',tag='INPUT')=>({tagName:tag,type,name:'',labels:[],getAttribute:k=>k==='aria-label'?label:null});
 assert.equal(placeholderFor(el('Business name')),'Juniper Studio');
 assert.equal(placeholderFor(el('Email address','email')),'name@example.com');
 assert.equal(placeholderFor(el('Notes','', 'TEXTAREA')),'Add notes…');
});
