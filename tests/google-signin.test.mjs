import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleAuth,googleCallback,authContext} from '../server/auth.mjs';

const base={THRIVE_AUTH_MODE:'supabase',THRIVE_APP_URL:'https://thrive.test',SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public',THRIVE_GOOGLE_LOGIN:'true'};
const env={...base,GOOGLE_CLIENT_ID:'client-123.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'test-secret'};
const user={id:'abc-user',email:'owner@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',app_metadata:{provider:'google'}};
const jwt=[btoa(JSON.stringify({alg:'HS256'})),btoa(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})),btoa('signature')].join('.');
const start=()=>new Request('https://thrive.test/api/auth',{method:'POST',headers:{'content-type':'application/json',origin:'https://thrive.test'},body:JSON.stringify({action:'oauth',provider:'google'})});
const sha=(value,enc)=>createHash('sha256').update(value).digest(enc);

// Fake network for Google's token endpoint and Supabase's id_token grant.
function network({google=()=>Response.json({id_token:'google-id-token'}),onSupabase}={}){
 const calls=[];
 const fetcher=async(url,init)=>{const u=String(url);calls.push(u);
  if(u==='https://oauth2.googleapis.com/token')return google(new URLSearchParams(init.body));
  if(u.includes('/auth/v1/token?grant_type=id_token')){onSupabase?.(JSON.parse(init.body));return Response.json({access_token:jwt,refresh_token:'refresh',token_type:'bearer',expires_in:3600,user});}
  if(u.endsWith('/auth/v1/user'))return Response.json(user);
  throw Error('Unexpected request '+u);};
 return {calls,fetcher,factory:(req,settings)=>authContext(req,settings,fetcher)};
}
const cookieFrom=response=>response.headers.getSetCookie().find(c=>c.startsWith('thrive-google-oauth='));
const callback=(query,cookie)=>new Request('https://thrive.test/auth/google/callback?'+query,{headers:cookie?{cookie}:{}});

test('Google sign-in starts on Google with Thrive’s callback, PKCE, a hashed nonce and a scoped one-time cookie',async()=>{
 const net=network(),r=await handleAuth(start(),env,{contextFactory:net.factory});
 assert.equal(r.status,200);assert.equal(net.calls.length,0);
 const url=new URL((await r.json()).redirect),p=url.searchParams,set=cookieFrom(r),[state,verifier,nonce]=set.split(';')[0].split('=')[1].split('.');
 assert.equal(url.origin+url.pathname,'https://accounts.google.com/o/oauth2/v2/auth');
 assert.equal(p.get('client_id'),env.GOOGLE_CLIENT_ID);assert.equal(p.get('redirect_uri'),'https://thrive.test/auth/google/callback');
 assert.equal(p.get('scope'),'openid email profile');assert.equal(p.get('state'),state);
 assert.equal(p.get('code_challenge'),sha(verifier,'base64url'));assert.equal(p.get('code_challenge_method'),'S256');assert.equal(p.get('nonce'),sha(nonce,'hex'));
 assert.ok(!url.href.includes('test-secret'));
 assert.match(set,/; Path=\/auth\/google; Max-Age=600; HttpOnly; SameSite=Lax; Secure$/);
});

test('without a Google client ID and secret, sign-in keeps Supabase’s hosted redirect',async()=>{
 let input;const r=await handleAuth(start(),base,{contextFactory:()=>({client:{auth:{signInWithOAuth:async v=>{input=v;return {data:{url:'https://project.supabase.co/auth/v1/authorize?provider=google'},error:null};}}},origin:'https://thrive.test',finish:x=>x})});
 assert.equal(input.provider,'google');assert.equal(input.options.redirectTo,'https://thrive.test/auth/callback');
 assert.equal(new URL((await r.json()).redirect).origin,'https://project.supabase.co');
 const back=await googleCallback(callback('code=c&state=s','thrive-google-oauth=s.v.n'),base,{contextFactory:network().factory});
 assert.equal(back.headers.get('location'),'/auth/sign-in?error=link');
});

test('Google’s return exchanges the code, signs in to Supabase with the ID token and raw nonce, and clears the state cookie',async()=>{
 let tokenForm,supabaseBody;
 const net=network({google:form=>{tokenForm=form;return Response.json({id_token:'google-id-token'});},onSupabase:b=>{supabaseBody=b;}});
 const begun=await handleAuth(start(),env,{contextFactory:net.factory}),pair=cookieFrom(begun).split(';')[0],[state,verifier,nonce]=pair.split('=')[1].split('.');
 const r=await googleCallback(callback(`code=google-code&state=${state}`,pair),env,{contextFactory:net.factory,fetcher:net.fetcher});
 assert.equal(r.status,303);assert.equal(r.headers.get('location'),'https://thrive.test/');
 assert.equal(tokenForm.get('code'),'google-code');assert.equal(tokenForm.get('code_verifier'),verifier);assert.equal(tokenForm.get('client_secret'),'test-secret');
 assert.equal(tokenForm.get('redirect_uri'),'https://thrive.test/auth/google/callback');assert.equal(tokenForm.get('grant_type'),'authorization_code');
 assert.equal(supabaseBody.provider,'google');assert.equal(supabaseBody.id_token,'google-id-token');assert.equal(supabaseBody.nonce,nonce);
 const cookies=r.headers.getSetCookie();
 assert.ok(cookies.some(c=>c.startsWith('thrive-auth')&&/HttpOnly/i.test(c)),'Supabase session cookie');
 assert.ok(cookies.some(c=>c.startsWith('thrive-google-oauth=;')&&/Max-Age=0/.test(c)),'state cookie cleared');
 assert.match(r.headers.get('cache-control'),/no-store/);
});

test('a forged state, missing cookie or Google error never reaches Google’s token endpoint',async()=>{
 const net=network();
 for(const [query,cookie] of [['code=c&state=attacker','thrive-google-oauth=expected.v.n'],['code=c&state=s',''],['error=access_denied&state=s','thrive-google-oauth=s.v.n'],['state=s','thrive-google-oauth=s.v.n']]){
  const r=await googleCallback(callback(query,cookie),env,{contextFactory:net.factory,fetcher:net.fetcher});
  assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/auth/sign-in?error=link');
  assert.ok(r.headers.getSetCookie().some(c=>c.startsWith('thrive-google-oauth=;')));
 }
 assert.equal(net.calls.length,0);
 const rejected=network({google:()=>Response.json({error:'invalid_grant'},{status:400})});
 const r=await googleCallback(callback('code=c&state=s','thrive-google-oauth=s.v.n'),env,{contextFactory:rejected.factory,fetcher:rejected.fetcher});
 assert.equal(r.headers.get('location'),'/auth/sign-in?error=link');assert.ok(!rejected.calls.some(u=>u.includes('grant_type=id_token')));
});

test('invite-only and owner-only rules still apply after a Google return',async()=>{
 const invite={...env,THRIVE_ACCESS:'invite'};
 let net=network();
 let begun=await handleAuth(start(),invite,{contextFactory:net.factory}),pair=cookieFrom(begun).split(';')[0];
 let r=await googleCallback(callback(`code=c&state=${pair.split('=')[1].split('.')[0]}`,pair),invite,{contextFactory:net.factory,fetcher:net.fetcher,grant:async()=>false});
 assert.equal(r.headers.get('location'),'https://thrive.test/?access=pending');
 const owner={...env,THRIVE_OWNER_EMAIL:'someone-else@example.test'};net=network();
 begun=await handleAuth(start(),owner,{contextFactory:net.factory});pair=cookieFrom(begun).split(';')[0];
 r=await googleCallback(callback(`code=c&state=${pair.split('=')[1].split('.')[0]}`,pair),owner,{contextFactory:net.factory,fetcher:net.fetcher});
 assert.equal(r.headers.get('location'),'/auth/sign-in?error=link');
});
