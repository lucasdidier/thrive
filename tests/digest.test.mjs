import test from 'node:test';
import assert from 'node:assert/strict';
import {visitRow,recordVisit} from '../server/visits.mjs';
import {digestDay,gatherDigest,sendDigest,digestText} from '../server/digest.mjs';
import {searchConsoleConfig} from '../server/search-console.mjs';
import {siteRoute} from '../server/hosts.mjs';

const on={THRIVE_ANALYTICS:'on',THRIVE_DATA_BACKEND:'supabase'};
// A tiny stand-in for the Supabase client: each table returns fixed rows; inserts are recorded.
function fakeAdmin(tables={}){
 const inserted=[];
 const builder=(table)=>{const q={rows:tables[table]||[],head:false,
  select(_c,o){if(o?.head)q.head=true;return q;},gte(){return q;},lt(){return q;},eq(k,v){q.rows=q.rows.filter(r=>r[k]===v);return q;},limit(){return q;},
  then(res,rej){return Promise.resolve(q.head?{count:q.rows.length,error:null}:{data:q.rows,error:null}).then(res,rej);},
  insert:async row=>{inserted.push({table,row});return {error:null};},delete(){return {lt:async()=>({error:null})};}};return q;};
 return {inserted,from:builder};
}

test('a visit keeps only coarse, non-identifying fields', ()=>{
 assert.deepEqual(visitRow({path:'/blog/fr/client-portals',lang:'fr',ref:'Google.com',source:'newsletter',device:'mobile',first:true},{country:'PT'}),
  {path:'/blog/fr/client-portals',lang:'fr',referrer:'google.com',source:'newsletter',medium:'',campaign:'',country:'PT',device:'mobile',new_session:true});
 assert.equal(visitRow({path:'javascript:alert(1)'}),null);
 assert.equal(visitRow({path:'/x',ref:'<script>'}).referrer,'');
 assert.equal(visitRow({path:'/x'},{country:'XX'}).country,'');
});

test('visits are recorded only when analytics is on, and never for bots', async()=>{
 const post=(ua='Mozilla/5.0')=>new Request('https://runonthrive.com/visit',{method:'POST',headers:{'user-agent':ua,'cf-ipcountry':'FR'},body:JSON.stringify({path:'/',first:true})});
 const admin=fakeAdmin();
 await recordVisit(post(),{THRIVE_DATA_BACKEND:'supabase'},{admin});
 await recordVisit(post('Googlebot/2.1'),on,{admin});
 await recordVisit(post(),on,{admin});
 assert.equal(admin.inserted.length,1);assert.equal(admin.inserted[0].row.country,'FR');
 assert.equal(siteRoute(new Request('https://runonthrive.com/visit',{method:'POST'}),{THRIVE_APP_URL:'https://app.runonthrive.com',THRIVE_SITE_URL:'https://runonthrive.com'}),null,'served on the site');
});

test('the digest covers yesterday in Lisbon, summer and winter', ()=>{
 assert.deepEqual({...digestDay(new Date('2026-11-11T07:30:00Z'))},{date:'2026-11-10',start:new Date('2026-11-10T00:00:00Z'),end:new Date('2026-11-11T00:00:00Z'),hour:7});
 const summer=digestDay(new Date('2026-07-11T06:10:00Z'));
 assert.equal(summer.start.toISOString(),'2026-07-09T23:00:00.000Z');assert.equal(summer.hour,7);
});

test('the digest adds up visits, sign-ups, plans and usage, leaving the admin out', async()=>{
 const env={...on,THRIVE_ADMIN_EMAIL:'me@thrive.test',PADDLE_YEARLY_PRICE_ID:'pri_year'};
 const admin=fakeAdmin({
  thrive_visits:[{path:'/',lang:'en',referrer:'google.com',source:'',country:'PT',new_session:true},{path:'/blog',lang:'en',referrer:'',source:'',country:'PT',new_session:false},{path:'/auth/sign-up',lang:'fr',referrer:'',source:'newsletter',country:'FR',new_session:true}],
  thrive_subscriptions:[{email:'pat@x.test',status:'active',price_id:'pri_month',paddle_subscription_id:'sub_1',trial_ends_at:'2026-01-01'},{email:'sam@x.test',status:'active',price_id:'pri_year',paddle_subscription_id:'sub_2',trial_ends_at:'2026-01-01'},{email:'new@x.test',trial_ends_at:'2030-01-01',comped:false},{email:'me@thrive.test',trial_ends_at:'2030-01-01'}],
  thrive_usage:[{owner_id:'a',email:'pat@x.test',event:'page',page:'invoices'},{owner_id:'a',email:'pat@x.test',event:'action',detail:'new-invoice'},{owner_id:'me',email:'me@thrive.test',event:'page',page:'overview'}],
 });
 const d=await gatherDigest(env,{admin,now:new Date('2026-11-11T07:00:00Z')});
 assert.equal(d.visits.visits,2);assert.equal(d.visits.pageViews,3);assert.equal(d.visits.signupPage,1);
 assert.deepEqual(d.visits.sources,[['google.com',1],['newsletter',1]]);
 assert.equal(d.plans.paid,2);assert.equal(d.plans.yearly,1);assert.equal(d.plans.mrr,18.33);assert.equal(d.plans.trials,1);
 assert.equal(d.product.activePeople,1);assert.deepEqual(d.product.actions,[['new-invoice',1]]);
 assert.equal(d.signups.emails.includes('me@thrive.test'),false);
 assert.equal(d.seo,null);assert.match(digestText(d),/SEARCH: not connected yet/);
});

test('the digest goes out once, at 7:00 Lisbon, only where THRIVE_DIGEST_TO is set', async()=>{
 const sent=[];const fetcher=async(url,init)=>{sent.push(init);return new Response('{}',{status:200});};
 const env={...on,THRIVE_DIGEST_TO:'me@thrive.test',RESEND_API_KEY:'re_x',THRIVE_NOTIFICATIONS_FROM:'Thrive <n@thrive.test>'};
 assert.deepEqual(await sendDigest({...env,THRIVE_DIGEST_TO:''},{admin:fakeAdmin(),fetcher}),{skipped:true});
 assert.deepEqual(await sendDigest(env,{admin:fakeAdmin(),fetcher,now:new Date('2026-11-11T09:00:00Z')}),{skipped:true});
 assert.deepEqual(await sendDigest(env,{admin:fakeAdmin(),fetcher,now:new Date('2026-11-11T07:05:00Z')}),{sent:true,date:'2026-11-10'});
 assert.equal(sent.length,1);assert.equal(sent[0].headers['Idempotency-Key'],'digest-2026-11-10');
 assert.match(JSON.parse(sent[0].body).subject,/^Thrive daily: 0 visits/);
});

test('Search Console needs both the service account and the site', ()=>{
 assert.equal(searchConsoleConfig({}),null);
 assert.equal(searchConsoleConfig({GSC_SITE:'sc-domain:x',GSC_SERVICE_ACCOUNT:'not json'}),null);
 assert.deepEqual(searchConsoleConfig({GSC_SITE:'sc-domain:x',GSC_SERVICE_ACCOUNT:JSON.stringify({client_email:'a@b.iam.gserviceaccount.com',private_key:'k'})}),{email:'a@b.iam.gserviceaccount.com',key:'k',site:'sc-domain:x'});
});

test('the app shell shows a loading skeleton until the first render replaces it', async()=>{
 const {readFileSync}=await import('node:fs');
 const shell=readFileSync(new URL('../ui/index.html',import.meta.url),'utf8'),app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(shell,/<main id="main" tabindex="-1" aria-busy="true"><div class="sk-page"/);
 assert.match(shell,/prefers-reduced-motion:reduce\)\{\.sk::after\{animation:none\}/);
 assert.match(app,/function render\(\)\{document\.querySelector\('#main\[aria-busy\]'\)\?\.removeAttribute\('aria-busy'\)/);
});
