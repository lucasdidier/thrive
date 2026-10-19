import test from 'node:test';
import assert from 'node:assert/strict';
import {accountNotificationEmail,formNotificationMessage,notifyFormResponse} from '../server/form-notifications.mjs';

test('notification recipient is the verified account email, never profile metadata or submitter input',async()=>{
 const db={client:{auth:{admin:{getUserById:async id=>{assert.equal(id,'user-id');return {data:{user:{email:'owner@example.com',email_confirmed_at:'2026-01-01',user_metadata:{email:'attacker@example.com'}}}};}}}}};
 assert.equal(await accountNotificationEmail(db,'supabase:user-id'),'owner@example.com');
 assert.equal(await accountNotificationEmail(db,'preview'),null);
 db.client.auth.admin.getUserById=async()=>({data:{user:{email:'unverified@example.com'}}});
 assert.equal(await accountNotificationEmail(db,'supabase:user-id'),null);
});
test('notification content is compact plaintext and links to authenticated Thrive, without private answers or share tokens',()=>{
 const msg=formNotificationMessage({formTitle:'Contact\r\nInjected',contactName:'Alex',contactEmail:'client@example.com',answers:[{label:'Secret',value:'PRIVATE'}]},'https://thrive.example');
 assert.equal(msg.subject,'New form response: Contact Injected');assert.match(msg.body,/https:\/\/thrive.example\/#forms/);assert.ok(!msg.body.includes('PRIVATE'));
});
test('disabled notifications and missing submissions do not resolve recipients or send',async()=>{
 const state={settings:{formEmailNotifications:false},submissions:[{id:'sub'}]},db={kind:'supabase',loadWorkspace:async()=>({state,revision:1})};
 let calls=0;const dependencies={recipient:async()=>{calls++;return 'owner@example.com';},send:async()=>{calls++;}};
 assert.equal((await notifyFormResponse(db,'supabase:user','missing',{},dependencies)).status,'disabled');assert.equal(calls,0);
 assert.equal((await notifyFormResponse(db,'supabase:user','sub',{},dependencies)).status,'disabled');assert.equal(calls,0);
 state.settings.formEmailNotifications=true;
 await notifyFormResponse(db,'supabase:user','sub',{THRIVE_APP_URL:'https://thrive.example'},dependencies);assert.equal(calls,2);
});
