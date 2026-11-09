import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleAuth,accountConfig,verifiedAccount} from '../server/auth.mjs';

// Invite-only production: invited emails sign in with Google or a code sent to their inbox.
const env={THRIVE_AUTH_MODE:'supabase',THRIVE_DATA_BACKEND:'supabase',THRIVE_ACCESS:'invite',THRIVE_APP_URL:'https://thrive.test',SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public'};
const post=body=>new Request('https://thrive.test/api/auth',{method:'POST',headers:{'content-type':'application/json',origin:'https://thrive.test'},body:JSON.stringify(body)});
const codeUser={id:'u9',email:'sam@example.test',email_confirmed_at:'2026-11-09',app_metadata:{provider:'email',providers:['email']}};
function client(overrides={}){
 const calls=[];
 const auth={
  signInWithOtp:async input=>{calls.push(['otp',input]);return {data:{},error:null};},
  verifyOtp:async input=>{calls.push(['verify',input]);return {data:{user:codeUser,session:{}},error:null};},
  signOut:async()=>{calls.push(['signOut']);return {error:null};},
  getUser:async()=>({data:{user:null},error:null}),
  ...overrides};
 return {calls,factory:()=>({client:{auth},origin:'https://thrive.test',finish:r=>r})};
}
const invitedOnly=email=>async e=>e===email;

test('invite mode advertises email codes; owner-only and open modes do not',()=>{
 assert.equal(accountConfig(env).emailCode,true);
 assert.equal(!!accountConfig({...env,THRIVE_ACCESS:'',THRIVE_OWNER_EMAIL:'me@example.test'}).emailCode,false);
 assert.equal(!!accountConfig({...env,THRIVE_ACCESS:''}).emailCode,false);
});

test('an invited email gets a code; the address is normalized and the link returns to the callback',async()=>{
 const m=client();
 const r=await handleAuth(post({action:'email-code',email:' Sam@Example.test '}),env,{contextFactory:m.factory,invited:invitedOnly('sam@example.test')});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,sent:true});
 assert.deepEqual(m.calls,[['otp',{email:'sam@example.test',options:{shouldCreateUser:true,emailRedirectTo:'https://thrive.test/auth/callback'}}]]);
});

test('uninvited or malformed emails never reach Supabase',async()=>{
 const m=client();
 let r=await handleAuth(post({action:'email-code',email:'stranger@example.test'}),env,{contextFactory:m.factory,invited:invitedOnly('sam@example.test')});
 assert.equal(r.status,403);assert.match((await r.json()).error,/beta list/);
 r=await handleAuth(post({action:'email-code',email:'not-an-email'}),env,{contextFactory:m.factory,invited:invitedOnly('sam@example.test')});
 assert.equal(r.status,400);
 assert.deepEqual(m.calls,[]);
});

test('a valid code signs in, grants beta access and opens the workspace',async()=>{
 const m=client();let granted;
 const r=await handleAuth(post({action:'verify-code',email:'Sam@example.test',code:'123 456'}),env,{contextFactory:m.factory,grant:async user=>{granted=user.id;return true;}});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,redirect:'/'});
 assert.deepEqual(m.calls,[['verify',{email:'sam@example.test',token:'123456',type:'email'}]]);
 assert.equal(granted,'u9');
});

test('malformed, wrong or expired codes fail without detail, and revoked invites are signed out',async()=>{
 const m=client();
 let r=await handleAuth(post({action:'verify-code',email:'sam@example.test',code:'12ab'}),env,{contextFactory:m.factory,grant:async()=>true});
 assert.equal(r.status,400);assert.deepEqual(m.calls,[]);
 const wrong=client({verifyOtp:async()=>({data:null,error:{message:'Token has expired or is invalid'}})});
 r=await handleAuth(post({action:'verify-code',email:'sam@example.test',code:'654321'}),env,{contextFactory:wrong.factory,grant:async()=>true});
 assert.equal(r.status,400);assert.match((await r.json()).error,/incorrect or has expired/);
 const revoked=client();
 r=await handleAuth(post({action:'verify-code',email:'sam@example.test',code:'654321'}),env,{contextFactory:revoked.factory,grant:async()=>false});
 assert.equal(r.status,403);assert.deepEqual(revoked.calls.map(c=>c[0]),['verify','signOut']);
});

test('passwords stay closed in invite mode, and code actions stay closed elsewhere',async()=>{
 for(const action of ['signin','signup','forgot','resend']){const m=client();const r=await handleAuth(post({action,email:'sam@example.test',password:'twelve-characters'}),env,{contextFactory:m.factory});assert.equal(r.status,403);assert.deepEqual(m.calls,[]);}
 for(const settings of [{...env,THRIVE_ACCESS:'',THRIVE_OWNER_EMAIL:'me@example.test'},{...env,THRIVE_ACCESS:''}]){
  const m=client();const r=await handleAuth(post({action:'email-code',email:'sam@example.test'}),settings,{contextFactory:m.factory,invited:async()=>true});
  assert.equal(r.status,403);assert.deepEqual(m.calls,[]);
 }
});

test('email-code accounts are not offered password changes in invite mode',async()=>{
 const member={...codeUser,app_metadata:{...codeUser.app_metadata,thrive_beta:true}};
 const account=await verifiedAccount({client:{auth:{getUser:async()=>({data:{user:member},error:null})}}},new Request('https://thrive.test/api/workspace'),env);
 assert.equal(account.owner,'supabase:u9');assert.equal(account.provider,'email');assert.equal(account.passwordAccount,false);
});

// Open sign-up (THRIVE_ACCESS=open): the same passwordless sign-in, for any address.
const open={...env,THRIVE_ACCESS:'open'};

test('open sign-up offers Google and email codes to everyone, still without passwords',async()=>{
 const config=accountConfig(open);
 assert.equal(config.openSignup,true);assert.equal(config.emailCode,true);assert.equal(config.inviteOnly,undefined);assert.equal(config.providers.google,true);
 for(const action of ['signin','signup','forgot']){const m=client();const r=await handleAuth(post({action,email:'sam@example.test',password:'twelve-characters'}),open,{contextFactory:m.factory});assert.equal(r.status,403);assert.deepEqual(m.calls,[]);}
});

test('open sign-up sends a code to any address and signs in without an invite',async()=>{
 let asked=false;const m=client();
 let r=await handleAuth(post({action:'email-code',email:'New@Example.test'}),open,{contextFactory:m.factory,invited:async()=>{asked=true;return false;}});
 assert.equal(r.status,200);assert.equal(asked,false);assert.deepEqual(m.calls[0],['otp',{email:'new@example.test',options:{shouldCreateUser:true,emailRedirectTo:'https://thrive.test/auth/callback'}}]);
 let granted=false;
 r=await handleAuth(post({action:'verify-code',email:'new@example.test',code:'123456'}),open,{contextFactory:m.factory,grant:async()=>{granted=true;return false;}});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true,redirect:'/'});assert.equal(granted,false);
});

test('open sign-up admits any confirmed account and no unconfirmed one',async()=>{
 const as=user=>verifiedAccount({client:{auth:{getUser:async()=>({data:{user},error:null})}}},new Request('https://thrive.test/api/workspace'),open);
 assert.equal((await as(codeUser)).owner,'supabase:u9');
 assert.equal((await as({...codeUser,id:'g1',app_metadata:{provider:'google'}})).owner,'supabase:g1');
 assert.equal(await as({...codeUser,email_confirmed_at:null}),null);
 assert.equal((await as(codeUser)).passwordAccount,false);
});

test('signed-out visitors get the landing page in invite-only and open deployments',()=>{
 const route=readFileSync(new URL('../app/route.ts',import.meta.url),'utf8');
 assert.match(route,/landing:passwordless\(env\)\?landing/);
 assert.match(readFileSync(new URL('../wrangler.production.jsonc',import.meta.url),'utf8'),/"THRIVE_ACCESS": "open"/);
});

test('the sign-in page offers Google and an emailed code with no inline script',()=>{
 const html=readFileSync(new URL('../ui/auth.html',import.meta.url),'utf8'),js=readFileSync(new URL('../public/auth.js',import.meta.url),'utf8');
 assert.doesNotMatch(html,/<script(?![^>]*\bsrc=)[^>]*>/);
 assert.match(html,/src="\/appearance\.js"/);assert.match(html,/src="\/auth\.js"/);
 for(const text of ['Continue with Google','Email me a code','one-time-code','Resend code','Use another email'])assert.ok(js.includes(text),text);
});
