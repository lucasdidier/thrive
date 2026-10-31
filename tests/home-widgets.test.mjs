import test from 'node:test';
import assert from 'node:assert/strict';
import {homeWidgetPreferences} from '../public/home-widgets.js';
import {activityTarget} from '../public/activity-target.js';
const s={clients:[{id:'c1',name:'Willow'}],projects:[{id:'p1',name:'Brand refresh'}],documents:[{id:'d1',title:'Proposal',kind:'proposal'},{id:'d2',title:'Proposal',kind:'proposal'}],invoices:[{id:'i1',number:'INV-001'}]};
test('widget preferences default on and preserve explicitly hidden widgets',()=>{assert.deepEqual(homeWidgetPreferences({totals:false,activity:true,unknown:false}),{totals:false,calendar:true,invoices:true,awaiting:true,projects:true,activity:true});assert.ok(Object.values(homeWidgetPreferences(null)).every(Boolean));});
test('activity uses stable IDs after records are renamed',()=>{assert.deepEqual(activityTarget(s,{clientId:'c1',kind:'client',detail:'Old name'}),{action:'client',id:'c1'});assert.deepEqual(activityTarget(s,{documentId:'d2',text:'Proposal published'}),{action:'document',id:'d2'});});
test('legacy activity resolves only unique matching records',()=>{assert.deepEqual(activityTarget(s,{kind:'project',text:'Project created',detail:'Brand refresh'}),{action:'project',id:'p1'});assert.deepEqual(activityTarget(s,{text:'Proposal published',detail:'Proposal'}),{action:'navigate',page:'proposals'});});
test('deleted and archived records fall back to the relevant list',()=>{assert.deepEqual(activityTarget(s,{clientId:'missing',kind:'client',detail:'Willow'}),{action:'navigate',page:'clients'});assert.deepEqual(activityTarget({...s,documents:[{id:'d3',archived:true}]},{documentId:'d3',text:'Contract published'}),{action:'navigate',page:'contracts'});});
test('invoice and email events route to their matching record or area',()=>{assert.deepEqual(activityTarget(s,{text:'Invoice issued',detail:'INV-001'}),{action:'invoice',id:'i1'});assert.deepEqual(activityTarget(s,{threadId:'thread',kind:'mail'}),{action:'mail-project-thread',id:'thread'});assert.deepEqual(activityTarget(s,{kind:'mail'}),{action:'navigate',page:'messages'});});

test('split follow-up widgets preserve old preferences while allowing independent choices',()=>{
 const hidden=homeWidgetPreferences({followup:false});
 assert.equal(hidden.invoices,false);assert.equal(hidden.awaiting,false);
 const migrated=homeWidgetPreferences({followup:false,invoices:true});
 assert.equal(migrated.invoices,true);assert.equal(migrated.awaiting,false);
 assert.deepEqual(homeWidgetPreferences(JSON.parse(JSON.stringify(migrated))),migrated);
});
