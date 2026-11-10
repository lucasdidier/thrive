import test from 'node:test';
import assert from 'node:assert/strict';
import {usageRows,recordUsage,pruneUsage,analyticsEnabled} from '../server/analytics.mjs';
import {pageName} from '../public/analytics.js';

const on={THRIVE_ANALYTICS:'on',THRIVE_DATA_BACKEND:'supabase'};
const user={owner:'supabase:abc',email:'Pat@Example.com'};
function fakeAdmin(){const calls=[];return {calls,from(table){return {insert:async rows=>{calls.push({table,rows});return {error:null};},delete(){return {lt:async(col,v)=>{calls.push({table,delete:[col,v]});return {error:null};}};}};}};}
const post=body=>new Request('https://app.test/api/usage',{method:'POST',body:typeof body==='string'?body:JSON.stringify(body)});

test('page names drop record ids and keep settings sections', ()=>{
 assert.equal(pageName('#clients/c_123'),'clients');
 assert.equal(pageName('#settings/appearance'),'settings/appearance');
 assert.equal(pageName(''),'overview');
 assert.equal(pageName('#<script>'),'other');
});

test('usage rows keep only known events and plain names', ()=>{
 const rows=usageRows(user,{events:[{event:'page',page:'clients'},{event:'action',page:'invoices',detail:'new-invoice'},{event:'evil',page:'x'},{event:'action',detail:'Pat Smith <pat@example.com>'}]});
 assert.equal(rows.length,3);
 assert.deepEqual(rows[1],{owner_id:'supabase:abc',email:'pat@example.com',event:'action',page:'invoices',detail:'new-invoice'});
 assert.equal(rows[2].detail,'', 'free text is never stored');
 assert.equal(usageRows(user,{events:Array.from({length:99},()=>({event:'page'}))}).length,30);
});

test('recording is off unless THRIVE_ANALYTICS is on', async()=>{
 assert.equal(analyticsEnabled({THRIVE_DATA_BACKEND:'supabase'}),false);
 const admin=fakeAdmin();
 assert.equal((await recordUsage(post({events:[{event:'page'}]}),{THRIVE_DATA_BACKEND:'supabase'},user,{admin})).status,204);
 assert.equal(admin.calls.length,0);
});

test('a batch is inserted once; bad bodies are ignored', async()=>{
 const admin=fakeAdmin();
 await recordUsage(post({events:[{event:'open',detail:'desktop'},{event:'page',page:'overview'}]}),on,user,{admin});
 await recordUsage(post('not json'),on,user,{admin});
 await recordUsage(post({events:[]}),on,user,{admin});
 assert.equal(admin.calls.length,1);
 assert.equal(admin.calls[0].table,'thrive_usage');
 assert.equal(admin.calls[0].rows.length,2);
});

test('pruning removes events older than 12 months', async()=>{
 const admin=fakeAdmin();
 await pruneUsage(on,{admin,now:new Date('2027-11-12T00:00:00Z')});
 assert.deepEqual(admin.calls[0].delete,['at','2026-11-12T00:00:00.000Z']);
});
