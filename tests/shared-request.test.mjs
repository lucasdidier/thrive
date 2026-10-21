import test from 'node:test';
import assert from 'node:assert/strict';
import {requestShared} from '../public/shared-request.js';

test('shared GET and response POST preserve same-origin hosting access and never retry writes',async()=>{
 const calls=[];
 const gate=async(url,options)=>{calls.push({url,options});return options.credentials==='same-origin'?Response.json({entity:'document',actions:['sign']}):new Response('<h1>Sign in</h1>',{status:401});};
 assert.equal((await requestShared('/api/shared/token','GET',undefined,gate)).entity,'document');
 const body={request_id:'response-001',action:'sign',name:'Client',consent:true};
 await requestShared('/api/shared/token?item=doc','POST',body,gate);
 assert.equal(calls.length,2);assert.equal(calls[1].options.body,JSON.stringify(body));
 for(const {options} of calls){assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.headers.Accept,'application/json');assert.ok(!('Authorization' in options.headers));}
});
test('hosting HTML access failures are distinct from missing or revoked links',async()=>{
 for(const status of [401,403])await assert.rejects(()=>requestShared('/api/shared/token','GET',undefined,async()=>new Response('<html>Sign in</html>',{status})),e=>e.status===status&&/site access/.test(e.message));
 await assert.rejects(()=>requestShared('/api/shared/token','GET',undefined,async()=>Response.json({error:'This link is unavailable. Ask the sender for a new link.'},{status:404})),e=>e.status===404&&/Ask the sender/.test(e.message));
});
test('non-JSON failures and rejected document responses retain actionable status without re-sending',async()=>{
 await assert.rejects(()=>requestShared('/api/shared/token','GET',undefined,async()=>new Response('<html>Unavailable</html>')),e=>e.status===502&&/try again/.test(e.message));
 let count=0;await assert.rejects(()=>requestShared('/api/shared/token','POST',{action:'sign'},async()=>{count++;return Response.json({error:'Confirm that you agree.'},{status:400});}),e=>e.status===400&&e.message==='Confirm that you agree.');assert.equal(count,1);
});
