import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkspace} from '../server/account-workspace.mjs';
import {validateWorkspace} from '../server/validation.mjs';
import {gettingStartedProgress,rememberGettingStarted,skipGettingStarted} from '../public/getting-started.js';
import {settingsSection} from '../public/settings-page.js';
const fresh=()=>emptyWorkspace({name:'Alex'});
test('six optional steps start empty and a skip persists across reload without creating records',()=>{
 const s=fresh();assert.equal(gettingStartedProgress(s).length,6);assert.ok(gettingStartedProgress(s).every(x=>x.status==='pending'));
 skipGettingStarted(s,'services');const restored=validateWorkspace(JSON.parse(JSON.stringify(s)));
 assert.equal(gettingStartedProgress(restored).find(x=>x.id==='services').status,'skipped');assert.equal(restored.services.length,0);
 skipGettingStarted(restored,'services',true);assert.equal(gettingStartedProgress(restored).find(x=>x.id==='services').status,'pending');
});
test('actual work completes steps and remains complete when a draft is later removed',()=>{
 const s=fresh();s.clients.push({id:'c'});s.services.push({id:'s'});s.automation.workflows.push({id:'w'});s.invoiceDrafts=[{id:'i'}];s.documents.push({id:'d',kind:'contract'});
 assert.equal(gettingStartedProgress(s).filter(x=>x.status==='complete').length,5);
 rememberGettingStarted(s,{account:{gmail:true,calendar:true}});s.invoiceDrafts=[];
 assert.ok(gettingStartedProgress(JSON.parse(JSON.stringify(s))).every(x=>x.status==='complete'));
});
test('email alone, calendar alone, and reference documents do not complete unrelated steps',()=>{
 const s=fresh();s.documents.push({id:'d',kind:'document'});
 for(const account of [{gmail:true},{calendar:true},null])assert.equal(gettingStartedProgress(s,{account}).filter(x=>x.status==='complete').length,0);
 skipGettingStarted(s,'connections');rememberGettingStarted(s,{account:{gmail:true,calendar:true}});
 assert.equal(gettingStartedProgress(s).find(x=>x.id==='connections').status,'complete');
});
test('invalid checklist and photo inputs are rejected by server validation',()=>{
 const s=fresh();assert.throws(()=>skipGettingStarted(s,'unknown'));
 for(const value of [{completed:['unknown'],skipped:[]},{completed:['services','services'],skipped:[]},{completed:[],skipped:'all'}]){s.settings.gettingStarted=value;assert.throws(()=>validateWorkspace(s),/getting started/);}
 delete s.settings.gettingStarted;s.settings.profilePhoto='https://example.com/a.svg';assert.throws(()=>validateWorkspace(s),/profile photo/);
});
test('account and workspace settings resolve to separate entry points',()=>{
 assert.equal(settingsSection('#account/profile').group,'Personal');assert.equal(settingsSection('#account/appearance').id,'appearance');assert.equal(settingsSection('#settings').id,'workspace');assert.equal(settingsSection('#settings/profile').id,'profile');
});
