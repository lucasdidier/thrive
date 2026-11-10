import test from 'node:test';
import assert from 'node:assert/strict';
import {sendSignupAlert} from '../server/signup-alert.mjs';

const env={THRIVE_SIGNUP_ALERTS:'hello@runonthrive.com',RESEND_API_KEY:'re_test',THRIVE_NOTIFICATIONS_FROM:'Thrive <notifications@runonthrive.com>',THRIVE_ADMIN_EMAIL:'lucas@example.test'};
const user={id:'0f8f2a3e-1111-4c1e-9a10-000000000001',owner:'supabase:0f8f2a3e-1111-4c1e-9a10-000000000001',email:'sam@example.test',name:'Sam Rivera',business:'Juniper\nStudio',provider:'google'};
const recorder=(ok=true)=>{const calls=[];return {calls,fetcher:async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return {ok};}};};

test('a new account sends one "New sign-up" email to the alerts address',async()=>{
 const {calls,fetcher}=recorder();
 assert.deepEqual(await sendSignupAlert(env,user,{fetcher,now:new Date('2026-11-10T18:40:00Z')}),{sent:true});
 const [{url,init,body}]=calls;
 assert.equal(url,'https://api.resend.com/emails');assert.equal(init.headers['Idempotency-Key'],'signup-'+user.id);
 assert.deepEqual(body.to,['hello@runonthrive.com']);assert.equal(body.subject,'New sign-up: sam@example.test');
 assert.match(body.text,/^Sam Rivera just created a Thrive account\./);assert.match(body.text,/Signed up with: Google/);
 assert.match(body.text,/Business: Juniper Studio/);assert.match(body.text,/When: 2026-11-10 18:40 UTC/);
});

test('no alert without the alerts address (staging, self-hosted), for the admin, or without Resend',async()=>{
 const {calls,fetcher}=recorder();
 assert.deepEqual(await sendSignupAlert({...env,THRIVE_SIGNUP_ALERTS:''},user,{fetcher}),{sent:false});
 assert.deepEqual(await sendSignupAlert({...env,RESEND_API_KEY:''},user,{fetcher}),{sent:false});
 assert.deepEqual(await sendSignupAlert(env,{...user,email:'Lucas@example.test'},{fetcher}),{sent:false});
 assert.equal(calls.length,0);
});

test('a failing email never breaks the first workspace load',async()=>{
 assert.deepEqual(await sendSignupAlert(env,user,{fetcher:async()=>{throw Error('network');}}),{sent:false});
 assert.deepEqual(await sendSignupAlert(env,{...user,provider:'email'},{fetcher:recorder(false).fetcher}),{sent:false});
});
