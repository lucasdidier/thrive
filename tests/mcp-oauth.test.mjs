import test from 'node:test';
import assert from 'node:assert/strict';
import {mcpDiscovery,withMcpChallenge,oauthConsent,authorizationServer,resetAuthorizationServerCache} from '../server/mcp-oauth.mjs';
import {handleAuth,authCallback,safeNext} from '../server/auth.mjs';

const env={THRIVE_AUTH_MODE:'supabase',THRIVE_APP_URL:'https://thrive.test',SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public'};
const issuer='https://project.supabase.co/auth/v1';
const metadata={issuer,authorization_endpoint:issuer+'/oauth/authorize',token_endpoint:issuer+'/oauth/token',registration_endpoint:issuer+'/oauth/clients/register'};
function supabase(enabled=true){const calls=[];return {calls,fetcher:async url=>{calls.push(String(url));return enabled?Response.json(metadata):new Response('{}',{status:404});}};}
const get=(path,init)=>new Request('https://thrive.test'+path,init);
const id='3f0b9a54-1d2e-4c5b-9a8f-0e1d2c3b4a59';
// finish() that keeps extra cookies, like the real authContext.
const finish=(r,cookies=[])=>{const h=new Headers(r.headers);for(const c of cookies)h.append('Set-Cookie',c);return new Response(r.body,{status:r.status,headers:h});};
const user={id:'u1',email:'sam@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',app_metadata:{provider:'email'}};

test('nothing is advertised until Supabase’s OAuth server is on',async()=>{
 resetAuthorizationServerCache();const s=supabase(false);
 const r=await mcpDiscovery(get('/.well-known/oauth-protected-resource'),env,s.fetcher);
 assert.equal(r.status,404);assert.equal(s.calls[0],'https://project.supabase.co/.well-known/oauth-authorization-server/auth/v1');
 assert.equal(await mcpDiscovery(get('/api/workspace'),env,s.fetcher),null);
 const unauthorized=new Response('{}',{status:401});
 assert.equal(await withMcpChallenge(unauthorized,get('/mcp',{method:'POST'}),env,s.fetcher),unauthorized);
});

test('protected resource metadata points MCP clients at Supabase, with CORS and a cache',async()=>{
 resetAuthorizationServerCache();const s=supabase();
 for(const path of ['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp']){
  const r=await mcpDiscovery(get(path),env,s.fetcher),body=await r.json();
  assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'*');
  assert.deepEqual(body.authorization_servers,[issuer]);assert.equal(body.resource,'https://thrive.test/mcp');assert.deepEqual(body.bearer_methods_supported,['header']);
 }
 assert.equal(s.calls.length,1,'metadata is cached');
 const copy=await mcpDiscovery(get('/.well-known/oauth-authorization-server'),env,s.fetcher);assert.deepEqual(await copy.json(),metadata);
 assert.equal((await mcpDiscovery(get('/.well-known/oauth-protected-resource',{method:'OPTIONS'}),env,s.fetcher)).status,204);
 assert.equal((await mcpDiscovery(get('/.well-known/oauth-protected-resource',{method:'POST'}),env,s.fetcher)).status,405);
 resetAuthorizationServerCache();
 assert.equal((await mcpDiscovery(get('/.well-known/oauth-protected-resource'),{...env,THRIVE_MCP_OAUTH:'off'},s.fetcher)).status,404);
 assert.equal(await authorizationServer({...env,THRIVE_MCP_OAUTH:'off'},s.fetcher),null);
});

test('a 401 from /mcp tells the client where to sign in; other responses are untouched',async()=>{
 resetAuthorizationServerCache();const s=supabase();
 let r=await withMcpChallenge(new Response('{"error":"Sign in"}',{status:401}),get('/mcp',{method:'POST'}),env,s.fetcher);
 assert.equal(r.status,401);assert.equal(await r.text(),'{"error":"Sign in"}');
 assert.match(r.headers.get('www-authenticate'),/^Bearer resource_metadata="https:\/\/thrive\.test\/\.well-known\/oauth-protected-resource", scope="openid email profile"$/);
 r=await withMcpChallenge(new Response('{}',{status:401}),get('/mcp',{method:'POST',headers:{authorization:'Bearer expired'}}),env,s.fetcher);
 assert.match(r.headers.get('www-authenticate'),/error="invalid_token"/);
 const ok=new Response('{}'),other=new Response('{}',{status:401});
 assert.equal(await withMcpChallenge(ok,get('/mcp',{method:'POST'}),env,s.fetcher),ok);
 assert.equal(await withMcpChallenge(other,get('/api/workspace'),env,s.fetcher),other);
});

function consentContext({signedIn=true,details,approve,deny}={}){
 const calls=[];
 const oauth={getAuthorizationDetails:async v=>{calls.push(['details',v]);return details;},approveAuthorization:async(v,o)=>{calls.push(['approve',v,o]);return approve;},denyAuthorization:async(v,o)=>{calls.push(['deny',v,o]);return deny;}};
 return {calls,factory:()=>({client:{auth:{getUser:async()=>signedIn?{data:{user},error:null}:{data:{user:null},error:{status:401}},oauth}},origin:'https://thrive.test',finish})};
}
const post=(fields,origin='https://thrive.test')=>new Request('https://thrive.test/oauth/consent',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields)});

test('consent asks a signed-out visitor to sign in and come back to the same request',async()=>{
 const m=consentContext({signedIn:false});
 const r=await oauthConsent(get('/oauth/consent?authorization_id='+id),env,{contextFactory:m.factory});
 assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/auth/sign-in?next='+encodeURIComponent('/oauth/consent?authorization_id='+id));
 assert.equal(m.calls.length,0);
 assert.equal((await oauthConsent(get('/oauth/consent?authorization_id=../../x'),env,{contextFactory:m.factory})).status,400);
});

test('consent shows the assistant, the account and where it returns, with every value escaped',async()=>{
 const details={data:{authorization_id:id,redirect_uri:'https://claude.ai/api/mcp/auth_callback',client:{id:'c1',name:'Claude <script>',uri:'',logo_uri:''},user:{id:'u1',email:'sam@example.test'},scope:'openid email profile'},error:null};
 const m=consentContext({details}),r=await oauthConsent(get('/oauth/consent?authorization_id='+id),env,{contextFactory:m.factory}),html=await r.text();
 assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 assert.match(html,/Allow Claude &lt;script&gt; to use your Thrive workspace\?/);assert.ok(!html.includes('<script>'));
 assert.match(html,/sam@example\.test · returns to claude\.ai/);
 assert.match(html,new RegExp(`name="authorization_id" value="${id}"`));assert.match(html,/value="approve"/);assert.match(html,/value="deny"/);
});

test('an assistant the user already approved goes straight back; unsafe redirects never do',async()=>{
 let m=consentContext({details:{data:{redirect_url:'https://claude.ai/cb?code=abc&state=s'},error:null}});
 let r=await oauthConsent(get('/oauth/consent?authorization_id='+id),env,{contextFactory:m.factory});
 assert.equal(r.status,303);assert.equal(r.headers.get('location'),'https://claude.ai/cb?code=abc&state=s');
 m=consentContext({details:{data:{redirect_url:'javascript:alert(1)'},error:null}});
 r=await oauthConsent(get('/oauth/consent?authorization_id='+id),env,{contextFactory:m.factory});
 assert.equal(r.status,400);assert.equal(r.headers.get('location'),null);
 m=consentContext({details:{data:null,error:{message:'expired'}}});
 assert.equal((await oauthConsent(get('/oauth/consent?authorization_id='+id),env,{contextFactory:m.factory})).status,400);
});

test('Allow and Deny post back to Supabase from Thrive’s own origin only',async()=>{
 const m=consentContext({approve:{data:{redirect_url:'cursor://anysphere.cursor-mcp/oauth/callback?code=abc'},error:null},deny:{data:{redirect_url:'https://claude.ai/cb?error=access_denied'},error:null}});
 let r=await oauthConsent(post({authorization_id:id,decision:'approve'},'https://evil.test'),env,{contextFactory:m.factory});
 assert.equal(r.status,403);assert.equal(m.calls.length,0);
 r=await oauthConsent(post({authorization_id:id,decision:'approve'}),env,{contextFactory:m.factory});
 assert.equal(r.status,303);assert.equal(r.headers.get('location'),'cursor://anysphere.cursor-mcp/oauth/callback?code=abc');
 assert.deepEqual(m.calls.at(-1),['approve',id,{skipBrowserRedirect:true}]);
 r=await oauthConsent(post({authorization_id:id,decision:'deny'}),env,{contextFactory:m.factory});
 assert.equal(r.headers.get('location'),'https://claude.ai/cb?error=access_denied');assert.equal(m.calls.at(-1)[0],'deny');
 assert.equal((await oauthConsent(post({authorization_id:id,decision:'maybe'}),env,{contextFactory:m.factory})).status,400);
});

test('sign-in returns to a consent request and to nothing else',async()=>{
 assert.equal(safeNext('/oauth/consent?authorization_id='+id),'/oauth/consent?authorization_id='+id);
 for(const bad of ['https://evil.test','//evil.test','/','/oauth/consent?authorization_id='+id+'&x=1','/oauth/consent?authorization_id=a'])assert.equal(safeNext(bad),'');
 const open={...env,THRIVE_ACCESS:'open'},next='/oauth/consent?authorization_id='+id;
 const factory=()=>({client:{auth:{signInWithOtp:async()=>({data:{},error:null}),verifyOtp:async()=>({data:{user},error:null}),getUser:async()=>({data:{user},error:null}),exchangeCodeForSession:async()=>({data:{},error:null})}},origin:'https://thrive.test',finish});
 const auth=body=>new Request('https://thrive.test/api/auth',{method:'POST',headers:{'content-type':'application/json',origin:'https://thrive.test'},body:JSON.stringify(body)});
 let r=await handleAuth(auth({action:'email-code',email:'sam@example.test',next}),open,{contextFactory:factory});
 const set=r.headers.getSetCookie().find(c=>c.startsWith('thrive-next='));assert.match(set,/Max-Age=600; HttpOnly; SameSite=Lax; Secure$/);
 r=await handleAuth(auth({action:'verify-code',email:'sam@example.test',code:'123456',next}),open,{contextFactory:factory});
 assert.equal((await r.json()).redirect,next);assert.ok(r.headers.getSetCookie().some(c=>/^thrive-next=;.*Max-Age=0/.test(c)));
 r=await handleAuth(auth({action:'verify-code',email:'sam@example.test',code:'123456',next:'https://evil.test'}),open,{contextFactory:factory});
 assert.equal((await r.json()).redirect,'/');
 r=await authCallback(new Request('https://thrive.test/auth/callback?code=c',{headers:{cookie:'thrive-next='+encodeURIComponent(next)}}),open,{contextFactory:factory});
 assert.equal(r.headers.get('location'),'https://thrive.test'+next);
 r=await authCallback(new Request('https://thrive.test/auth/callback?code=c',{headers:{cookie:'thrive-next='+encodeURIComponent('https://evil.test')}}),open,{contextFactory:factory});
 assert.equal(r.headers.get('location'),'https://thrive.test/');
});
