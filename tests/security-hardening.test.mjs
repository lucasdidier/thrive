import test from 'node:test';
import assert from 'node:assert/strict';
import {rateLimited,clientKey,reportError} from '../server/guard.mjs';
import {connectorToken} from '../server/runtime.mjs';
import {canonicalEmail} from '../server/limits.mjs';
import {securityHeaders} from '../server/self-hosted.mjs';
import {pruneOrphanUploads} from '../server/maintenance.mjs';
import {handleBetaRequest} from '../server/beta.mjs';
import {MAX_WORKSPACES,createWorkspace} from '../server/workspace-directory.mjs';

const counter=()=>{const keys=[];return {keys,limit:async({key})=>{keys.push(key);return {success:true};}};};
const req=(path,method='POST',ip='203.0.113.9')=>new Request('https://app.runonthrive.com'+path,{method,headers:{'cf-connecting-ip':ip}});

test('public writes, page views, analytics, MCP and public link reads are rate limited', async()=>{
 const pub=counter(),mcp=counter(),env={RATE_LIMIT_PUBLIC:pub,RATE_LIMIT_MCP:mcp};
 for(const p of ['/visit','/api/usage','/api/errors','/api/shared/abc'])await rateLimited(req(p),env);
 await rateLimited(req('/api/shared/abc','GET'),env);await rateLimited(req('/embed/form/abc','GET'),env);
 await rateLimited(req('/blog','GET'),env);await rateLimited(req('/api/workspace','GET'),env);
 await rateLimited(req('/mcp'),env);
 assert.deepEqual(pub.keys,['visit:203.0.113.9','usage:203.0.113.9','errors:203.0.113.9','shared:203.0.113.9','shared-read:203.0.113.9','embed-read:203.0.113.9']);
 assert.deepEqual(mcp.keys,['mcp:203.0.113.9']);
});

test('an IPv6 visitor counts as their whole /64', ()=>{
 assert.equal(clientKey(req('/','POST','2001:db8:85a3:1:aaaa:bbbb:cccc:1')),'2001:db8:85a3:1::/64');
 assert.equal(clientKey(req('/','POST','2001:db8:85a3:1:ffff::2')),'2001:db8:85a3:1::/64');
 assert.equal(clientKey(req('/','POST','198.51.100.4')),'198.51.100.4');
});

test('unauthenticated browser error reports send at most one alert an hour, whatever the message', async()=>{
 const sent=[];const fetcher=async(url,init)=>{sent.push(init);return new Response('{}');};
 const env={RESEND_API_KEY:'re_x',THRIVE_NOTIFICATIONS_FROM:'n@x.test',THRIVE_ADMIN_EMAIL:'me@x.test'};
 const now=Date.UTC(2026,10,11,9);
 for(let i=0;i<5;i++)await reportError(env,{source:'browser',message:'spam '+i,path:'/'+i},{fetcher,now});
 assert.equal(sent.length,1);
});

test('AI connector tokens are recognised by their OAuth client claim', ()=>{
 const token=claims=>'Bearer x.'+btoa(JSON.stringify(claims)).replace(/=+$/,'')+'.y';
 const r=claims=>new Request('https://app.runonthrive.com/api/billing',{headers:{authorization:token(claims)}});
 assert.equal(connectorToken(r({sub:'u',client_id:'claude'})),true);
 assert.equal(connectorToken(r({sub:'u'})),false);
 assert.equal(connectorToken(new Request('https://app.runonthrive.com/api/billing')),false);
});

test('one trial per person: +tags and Gmail dots are the same address', ()=>{
 assert.equal(canonicalEmail('Pat.Smith+trial2@Gmail.com'),'patsmith@gmail.com');
 assert.equal(canonicalEmail('pat.smith+x@studio.example'),'pat.smith@studio.example');
 assert.equal(canonicalEmail('nope'),'');
});

test('access requests are closed when sign-up is open', async()=>{
 const r=await handleBetaRequest(new Request('https://app.runonthrive.com/api/beta',{method:'POST',headers:{origin:'https://app.runonthrive.com'},body:'{}'}),{THRIVE_ACCESS:'open'},{admin:{},send:async()=>{}});
 assert.equal(r.status,404);
});

test(`an account can have at most ${MAX_WORKSPACES} workspaces`, async()=>{
 const ids=Array.from({length:MAX_WORKSPACES},(_,i)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`);
 const row={revision:1,state:{workspaceIds:ids,profile:{name:'Pat'},activity:[],settings:{}}};
 const db={kind:'supabase',loadWorkspace:async()=>row,bootstrap:async()=>row};
 await assert.rejects(createWorkspace(db,{owner:'supabase:u',email:'pat@x.test'},{id:'11111111-1111-4111-8111-111111111111',name:'One more',currency:'EUR'}),/up to 20 workspaces/);
});

test('every response gets baseline security headers; embeds stay frameable; a page’s own CSP wins', ()=>{
 const html=(h={})=>new Response('<p>',{headers:{'content-type':'text/html',...h}});
 const app=securityHeaders(html(),'/');
 assert.equal(app.headers.get('x-frame-options'),'DENY');assert.match(app.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 assert.equal(app.headers.get('x-content-type-options'),'nosniff');assert.match(app.headers.get('strict-transport-security'),/max-age=31536000/);
 const embed=securityHeaders(html(),'/embed/form/abc');assert.equal(embed.headers.get('x-frame-options'),null);
 const share=securityHeaders(html({'content-security-policy':"default-src 'none'"}),'/share/x');assert.equal(share.headers.get('content-security-policy'),"default-src 'none'");
 const redirect=securityHeaders(Response.redirect('https://runonthrive.com/',308),'/x');assert.equal(redirect.headers.get('x-content-type-options'),'nosniff');
});

test('abandoned form uploads are deleted; uploads used in a submission are kept', async()=>{
 const deleted=[],removedRows=[];
 const uploads=[{id:'up_used',owner_id:'supabase:o',object_key:'k1'},{id:'up_orphan',owner_id:'supabase:o',object_key:'k2'}];
 const state={submissions:[{answers:[{value:[{id:'up_used'}]}]}]};
 const {encodeState}=await import('../server/store.mjs');const bytes=await encodeState(state);
 const hex='\\x'+[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const admin={from:table=>{const q={select:()=>q,lt:()=>q,order:()=>q,limit:async()=>({data:uploads,error:null}),eq:(k,v)=>table==='thrive_workspaces'?{maybeSingle:async()=>({data:{revision:1,state:hex,updated_at:''},error:null})}:(k==='id'&&removedRows.push(v),{eq:async()=>({error:null})}),delete:()=>q};return q;}};
 const r=await pruneOrphanUploads({THRIVE_DATA_BACKEND:'supabase'},{admin,bucket:{delete:async k=>deleted.push(k)}});
 assert.deepEqual(deleted,['k2']);assert.deepEqual(removedRows,['up_orphan']);assert.equal(r.removed,1);
});
