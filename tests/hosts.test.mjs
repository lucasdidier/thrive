import test from 'node:test';
import assert from 'node:assert/strict';
import {siteOrigin,siteRoute} from '../server/hosts.mjs';
import {selfHostedFetch} from '../server/self-hosted.mjs';

const env={THRIVE_AUTH_MODE:'supabase',THRIVE_DATA_BACKEND:'supabase',THRIVE_APP_URL:'https://app.thrive.test',THRIVE_SITE_URL:'https://thrive.test',SUPABASE_URL:'https://project.supabase.co'};
const req=(url,init)=>new Request(url,init);

test('the site origin only applies when it differs from the app and is HTTPS',()=>{
 assert.equal(siteOrigin(env),'https://thrive.test');
 assert.equal(siteOrigin({...env,THRIVE_SITE_URL:''}),'');
 assert.equal(siteOrigin({...env,THRIVE_SITE_URL:'https://app.thrive.test'}),'');
 assert.equal(siteOrigin({...env,THRIVE_SITE_URL:'http://thrive.test'}),'');
});

test('the site serves the landing at /, its pages and static files, and moves everything else to the app',()=>{
 assert.equal(new URL(siteRoute(req('https://thrive.test/?ref=x'),env).request.url).pathname,'/landing');
 for(const path of ['/privacy','/terms','/llms.txt','/landing.css','/agents/claude-color.svg','/fonts/InterVariable.woff2','/embed.js'])assert.equal(siteRoute(req('https://thrive.test'+path),env),null,path);
 for(const path of ['/auth/sign-in?next=x','/api/workspace','/mcp','/oauth/consent?authorization_id=abc','/share/token','/embed/form/token','/.well-known/oauth-protected-resource']){
  const r=siteRoute(req('https://thrive.test'+path),env).response;
  assert.equal(r.status,308,path);assert.equal(r.headers.get('location'),'https://app.thrive.test'+path);
 }
 assert.equal(siteRoute(req('https://thrive.test/landing'),env).response.headers.get('location'),'https://thrive.test/');
 assert.equal(siteRoute(req('https://app.thrive.test/'),env),null,'the app host is untouched');
 assert.equal(siteRoute(req('https://thrive.test/mcp'),{...env,THRIVE_SITE_URL:''}),null,'one host without a site URL');
});

test('the Worker redirects app paths on the site, including MCP posts, before running the app',async()=>{
 let called=0;const handler={fetch:async()=>{called++;return new Response('app');}};
 const r=await selfHostedFetch(handler,req('https://thrive.test/mcp',{method:'POST',body:'{}'}),env,{});
 assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://app.thrive.test/mcp');assert.equal(called,0);
 let seen;const landing={fetch:async request=>{seen=new URL(request.url).pathname;return new Response('landing');}};
 assert.equal(await (await selfHostedFetch(landing,req('https://thrive.test/'),env,{})).text(),'landing');assert.equal(seen,'/landing');
});
