import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {handleAuth,authCallback,accountHome,verifiedAccount,accountConfig} from '../server/auth.mjs';
import {grantBetaAccess,handleBetaRequest,sendBetaInvites,hasBetaAccess} from '../server/beta.mjs';
import {rateLimited,reportError} from '../server/guard.mjs';
import {runBackup} from '../server/backup.mjs';
import {runScheduled} from '../server/scheduled.mjs';

const env={THRIVE_AUTH_MODE:'supabase',THRIVE_DATA_BACKEND:'supabase',THRIVE_ACCESS:'invite',THRIVE_APP_URL:'https://thrive.test',SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public',THRIVE_GOOGLE_LOGIN:'false',THRIVE_MICROSOFT_LOGIN:'true',THRIVE_ADMIN_EMAIL:'admin@example.test'};
const invited={id:'u1',email:'Sam@Example.test',email_confirmed_at:'2026-11-01',app_metadata:{provider:'google'}};
const member={...invited,app_metadata:{provider:'google',thrive_beta:true}};
const post=(path,body,headers={})=>new Request('https://thrive.test'+path,{method:'POST',headers:{'content-type':'application/json',origin:'https://thrive.test',...headers},body:JSON.stringify(body)});
const authMock=(user,extra={})=>{const calls=[];return {calls,factory:()=>({client:{auth:{getUser:async()=>({data:{user},error:null}),exchangeCodeForSession:async()=>({data:{},error:null}),signOut:async()=>{calls.push('signOut');return {error:null};},signInWithOAuth:async()=>({data:{url:'https://project.supabase.co/auth/v1/authorize'},error:null}),...extra}},origin:'https://thrive.test',finish:r=>r})};};

// Minimal in-memory stand-in for the Supabase admin client.
function fakeAdmin(tables={},users=[]){
 const db=Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,[...v]]));const log=[];
 const from=name=>{const rows=()=>(db[name]??=[]);let filters=[],op='select',payload,opts={},range;
  const apply=()=>rows().filter(r=>filters.every(f=>f(r)));
  const run=async()=>{
   if(op==='upsert'){const added=[];for(const p of [].concat(payload)){if(!rows().some(r=>r[opts.onConflict]===p[opts.onConflict])){rows().push({...p});added.push(p);}}log.push([name,'upsert',payload]);return {data:added,error:null};}
   if(op==='update'){const hit=apply();hit.forEach(r=>Object.assign(r,payload));log.push([name,'update',payload]);return {data:hit,error:null};}
   let out=apply();if(range)out=out.slice(range[0],range[1]+1);return {data:out,error:null};
  };
  const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},is(k,v){filters.push(r=>(r[k]??null)===v);return q;},order(){return q;},limit(){return q;},range(a,b){range=[a,b];return q;},
   upsert(p,o){op='upsert';payload=p;opts=o;return q;},update(p){op='update';payload=p;return q;},
   maybeSingle:async()=>{const {data}=await run();return {data:data[0]||null,error:null};},then:(res,rej)=>run().then(res,rej)};
  return q;};
 return {db,log,from,auth:{admin:{updateUserById:async(id,attrs)=>{log.push(['auth','update',id,attrs]);return {error:null};},listUsers:async({page})=>({data:{users:page===1?users:[]},error:null})}},storage:{from:()=>({download:async()=>({data:new Blob(['file-bytes'])})})}};
}

test('invite mode accepts only Google accounts flagged for the beta',async()=>{
 assert.equal(hasBetaAccess(member),true);assert.equal(hasBetaAccess(invited),false);
 assert.equal(hasBetaAccess({...member,app_metadata:{provider:'email',thrive_beta:true}}),false);
 assert.equal(hasBetaAccess({...member,email_confirmed_at:null}),false);
 const req=new Request('https://thrive.test/api/workspace');
 assert.equal(await verifiedAccount({client:authMock(invited).factory().client},req,env),null);
 assert.equal((await verifiedAccount({client:authMock(member).factory().client},req,env)).owner,'supabase:u1');
});
test('invite mode offers Google only and blocks password signup before calling Supabase',async()=>{
 const config=accountConfig(env);assert.equal(config.inviteOnly,true);assert.deepEqual(config.providers,{google:true,microsoft:false});
 for(const action of ['signup','signin','forgot']){const r=await handleAuth(post('/api/auth',{action,email:'a@b.test',password:'twelve-characters'}),env,{contextFactory:authMock(null).factory});assert.equal(r.status,403);assert.match((await r.json()).error,/private beta/);}
 const r=await handleAuth(post('/api/auth',{action:'oauth',provider:'google'}),env,{contextFactory:authMock(null).factory});assert.equal(r.status,200);
});
test('uninvited Google sign-ins are signed out and sent to the landing page; invited ones are granted',async()=>{
 const denied=authMock(invited);let r=await authCallback(new Request('https://thrive.test/auth/callback?code=c'),env,{contextFactory:denied.factory,grant:async()=>false});
 assert.equal(r.headers.get('location'),'https://thrive.test/?access=pending');assert.deepEqual(denied.calls,['signOut']);
 const ok=authMock(invited);r=await authCallback(new Request('https://thrive.test/auth/callback?code=c'),env,{contextFactory:ok.factory,grant:async u=>u.id==='u1'});
 assert.equal(r.headers.get('location'),'https://thrive.test/');assert.deepEqual(ok.calls,[]);
});
test('signed-out visitors see the landing page in invite mode',async()=>{
 const r=await accountHome(new Request('https://thrive.test/'),env,'APP',{contextFactory:authMock(null).factory,landing:'LANDING'});assert.equal(await r.text(),'LANDING');
 const app=await accountHome(new Request('https://thrive.test/'),env,'APP',{contextFactory:authMock(member).factory,landing:'LANDING'});assert.equal(await app.text(),'APP');
});
test('granting access requires an invite and flags the account without touching other metadata',async()=>{
 const admin=fakeAdmin({thrive_beta_invites:[{email:'sam@example.test'}]});
 assert.equal(await grantBetaAccess(invited,env,{admin}),true);
 const update=admin.log.find(l=>l[0]==='auth');assert.deepEqual(update[3],{app_metadata:{provider:'google',thrive_beta:true}});
 assert.ok(admin.db.thrive_beta_invites[0].accepted_at);
 assert.equal(await grantBetaAccess({...invited,id:'u2',email:'other@example.test'},env,{admin:fakeAdmin()}),false);
 assert.equal(await grantBetaAccess({...invited,app_metadata:{provider:'email'}},env,{admin}),false);
});
test('access requests validate, ignore bots and repeats, and notify the admin once',async()=>{
 const admin=fakeAdmin(),sent=[];const send=async(_db,owner,_env,id,to,msg)=>{sent.push({owner,id,to,msg});return {status:'sent'};};
 let r=await handleBetaRequest(post('/api/beta',{name:'',email:'sam@example.test'}),env,{admin,send});assert.equal(r.status,400);
 r=await handleBetaRequest(post('/api/beta',{name:'Bot',email:'bot@example.test',website:'spam'}),env,{admin,send});assert.equal(r.status,200);assert.equal(admin.db.thrive_beta_requests,undefined);
 r=await handleBetaRequest(post('/api/beta',{name:'Sam',email:'Sam@Example.test',business:'Juniper',work:'Brand design'}),env,{admin,send});assert.equal(r.status,200);
 r=await handleBetaRequest(post('/api/beta',{name:'Sam again',email:'sam@example.test'}),env,{admin,send});assert.equal(r.status,200);
 assert.equal(admin.db.thrive_beta_requests.length,1);assert.equal(admin.db.thrive_beta_requests[0].name,'Sam');
 assert.equal(sent.length,1);assert.equal(sent[0].to,'admin@example.test');assert.equal(sent[0].owner,'system');assert.match(sent[0].msg.subject,/Sam · Juniper/);
 r=await handleBetaRequest(post('/api/beta',{name:'X',email:'x@example.test'},{origin:'https://evil.test'}),env,{admin,send});assert.equal(r.status,403);
});
test('new invites are emailed once, only when Thrive’s sender is configured',async()=>{
 const admin=fakeAdmin({thrive_beta_invites:[{email:'sam@example.test'},{email:'done@example.test',emailed_at:'x'}]}),sent=[];
 const send=async(_db,_o,_e,id,to)=>{sent.push([id,to]);return {status:'sent'};};
 assert.deepEqual(await sendBetaInvites(env,{admin,send,origin:'https://thrive.test'}),{sent:0});
 const mail={...env,RESEND_API_KEY:'k',THRIVE_NOTIFICATIONS_FROM:'Thrive <n@thrive.test>'};
 assert.deepEqual(await sendBetaInvites(mail,{admin,send,origin:'https://thrive.test'}),{sent:1});
 assert.deepEqual(sent,[['beta-invite:sam@example.test','sam@example.test']]);
 assert.deepEqual(await sendBetaInvites(mail,{admin,send,origin:'https://thrive.test'}),{sent:0});
});
test('public writes are rate limited per IP and route group; reads never are',async()=>{
 const keys=[];const limiter={limit:async({key})=>{keys.push(key);return {success:keys.length<=1};}};
 const e={RATE_LIMIT_SIGNUP:limiter,RATE_LIMIT_PUBLIC:limiter};
 const req=path=>new Request('https://thrive.test'+path,{method:'POST',headers:{'cf-connecting-ip':'1.2.3.4'}});
 assert.equal(await rateLimited(req('/api/beta'),e),false);assert.equal(await rateLimited(req('/api/beta'),e),true);
 assert.equal(keys[0],'beta:1.2.3.4');
 assert.equal(await rateLimited(new Request('https://thrive.test/api/beta'),e),false);
 assert.equal(await rateLimited(req('/api/workspace'),e),false);
 assert.equal(await rateLimited(req('/api/beta'),{}),false);
});
test('error alerts email the admin at most once per error type per hour',async()=>{
 const calls=[];const fetcher=async(url,init)=>{calls.push(init);return new Response('{}',{status:200});};
 const e={...env,RESEND_API_KEY:'k',THRIVE_NOTIFICATIONS_FROM:'Thrive <n@thrive.test>'},now=Date.UTC(2026,10,5,10);
 const orig=console.error;console.error=()=>{};
 try{
  await reportError(e,{source:'server',status:500,message:'Boom',path:'/api/shared/abc123def456'},{fetcher,now});
  await reportError(e,{source:'server',status:500,message:'Boom',path:'/api/shared/999888777666'},{fetcher,now:now+60000});
  await reportError(e,{source:'server',status:500,message:'Boom',path:'/api/shared/abc123def456'},{fetcher,now:now+3600000});
  assert.equal(calls.length,2);
  const body=JSON.parse(calls[0].body);assert.deepEqual(body.to,['admin@example.test']);assert.match(body.subject,/server error 500: Boom/);assert.match(calls[0].headers['Idempotency-Key'],/^alert-/);
  assert.deepEqual(await reportError(env,{source:'x',message:'no sender'},{fetcher}),{sent:false});
 }finally{console.error=orig;}
});
test('nightly backup writes one compressed snapshot per day and copies uploaded files once',async()=>{
 const objects=new Map();const BACKUPS={head:async k=>objects.has(k)?{}:null,put:async(k,v)=>{objects.set(k,v);}};
 const admin=fakeAdmin({thrive_workspaces:[{owner_id:'supabase:u1',revision:3,state:'\\x00'}],thrive_form_uploads:[{id:'f1',owner_id:'supabase:u1',object_key:'o/f1',status:'ready',name:'brief.pdf'},{id:'f2',status:'pending',object_key:'o/f2'}]},[member]);
 const e={...env,BACKUPS},now=new Date('2026-11-05T03:00:00Z');
 assert.deepEqual(await runBackup(e,{admin,now:new Date('2026-11-05T04:00:00Z')}),{skipped:'not-due'});
 assert.deepEqual(await runBackup({},{admin,now}),{skipped:'no-bucket'});
 const r=await runBackup(e,{admin,now});assert.equal(r.key,'db/2026-11-05.json.gz');assert.equal(r.files,1);
 const text=await new Response(new Blob([objects.get(r.key)]).stream().pipeThrough(new DecompressionStream('gzip'))).text(),data=JSON.parse(text);
 assert.equal(data.tables.workspaces[0].owner_id,'supabase:u1');assert.equal(data.accounts[0].thrive_beta,true);assert.ok(objects.has('files/o/f1'));assert.ok(!objects.has('files/o/f2'));
 assert.deepEqual(await runBackup(e,{admin,now}),{skipped:'done',key:'db/2026-11-05.json.gz'});
});
test('a failing scheduled job alerts and does not stop the others',async()=>{
 const orig=console.error;console.error=()=>{};
 try{const ran=[];const r=await runScheduled(env,{jobs:{a:async()=>{throw Error('down');},b:async()=>{ran.push('b');return {ok:true};}}});
 assert.deepEqual(r,{a:{error:'down'},b:{ok:true}});assert.deepEqual(ran,['b']);}finally{console.error=orig;}
});
test('landing, legal pages and production config ship together',()=>{
 const landing=readFileSync(new URL('../ui/landing.html',import.meta.url),'utf8');
 for(const s of ['Free for the first 100','id="request-form"','name="website"','/privacy','/terms','/auth/sign-in'])assert.ok(landing.includes(s),s);
 for(const img of [...landing.matchAll(/src="\/landing\/([a-z-]+\.webp)"/g)].map(m=>m[1]))assert.ok(existsSync(new URL('../public/landing/'+img,import.meta.url)),img);
 assert.equal((landing.match(/role="tab"/g)||[]).length,(landing.match(/role="tabpanel"/g)||[]).length);
 for(const media of [...landing.matchAll(/(?:src|poster)="\/landing\/([a-z-]+\.(?:mp4|webp))"/g)].map(m=>m[1]))assert.ok(existsSync(new URL('../public/landing/'+media,import.meta.url)),media);
 for(const page of ['privacy','terms'])assert.match(readFileSync(new URL(`../ui/${page}.html`,import.meta.url),'utf8'),/Last updated/);
 const prod=readFileSync(new URL('../wrangler.production.jsonc',import.meta.url),'utf8');
 for(const s of ['"THRIVE_ACCESS": "invite"','RATE_LIMIT_SIGNUP','"binding": "BACKUPS"','"observability"'])assert.ok(prod.includes(s),s);
 assert.doesNotMatch(prod,/SECRET|API_KEY"\s*:/);
});

test('landing page claims match the real workflow catalog and MCP tools',async()=>{
 const {triggers,actions}=await import('../public/workflow-domain.js');
 const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const landing=read('ui/landing.html'),script=read('public/landing.js'),server=read('server/mcp.mjs')+read('server/operations.mjs');
 assert.ok(landing.includes(`${triggers.length} triggers`),'trigger count');
 assert.ok(landing.includes(`${actions.length} actions`),'action count');
 // The AI examples only name tools and actions the MCP server really has.
 for(const [,tool] of (landing+script).matchAll(/\b(thrive_[a-z_]+)/g))assert.ok(server.includes(`'${tool}'`),tool);
 const ids=new Set(actions.map(a=>a.id));
 for(const [,id] of (landing+script).matchAll(/\b([a-z][A-Za-z]*\.[a-z_]+) [×·]/g))assert.ok(ids.has(id)||server.includes(`'${id}'`),id);
});
