import test from 'node:test';
import assert from 'node:assert/strict';
import {schedulerConfiguration,schedulerSlug,schedulerStatus,publishBookingPage,handleScheduler} from '../server/scheduler.mjs';
const env={NYLAS_CLIENT_ID:'client',NYLAS_API_KEY:'secret',NYLAS_TOKEN_ENCRYPTION_KEY:'fixture',NYLAS_REDIRECT_URI:'https://thrive.example/api/nylas/callback',NYLAS_REGION:'eu'};
const schedule={timeZone:'Europe/Lisbon',days:[1,2,3,4,5],start:540,end:1020,notice:4,types:[{id:'discovery',name:'Discovery',duration:30,buffer:15,description:'Discuss your project',location:'Online',active:true}]};
function fixture(){const state={settings:{business:'Business'},scheduling:structuredClone(schedule)},account={grant_id:'grant-owner',email:'owner@example.com',provider:'google',scopes:JSON.stringify(['https://www.googleapis.com/auth/calendar'])};const db={kind:'supabase',loadWorkspace:async owner=>owner==='alice'?{state}:null,prepare(){let owner;return {bind(value){owner=value;return this;},first:async()=>owner==='alice'?account:null};}};const configs=[],requests=[];const fetcher=async(url,opts)=>{assert.ok(url.startsWith('https://api.eu.nylas.com/v3/grants/grant-owner/'));requests.push({url,method:opts.method||'GET',body:opts.body&&JSON.parse(opts.body)});if(url.includes('/events?'))return Response.json({data:[]});if(url.includes('/calendars?'))return Response.json({data:[{id:'primary-readonly',is_primary:true,read_only:true},{id:'real-calendar',is_primary:true,read_only:false}]});if(!opts.method)return Response.json({data:configs});const body=JSON.parse(opts.body);if(opts.method==='POST'){configs.push({id:'config-1',...body});return Response.json({data:configs.at(-1)});}Object.assign(configs[0],body);return Response.json({data:configs[0]});};return {state,account,db,configs,requests,fetcher};}
test('Scheduler maps duration, timezone, notice and buffers to Nylas; no private workspace data',()=>{const c=schedulerConfiguration(schedule,schedule.types[0],{email:'owner@example.com'},'calendar-id','slug');assert.equal(c.availability.duration_minutes,30);assert.deepEqual(c.availability.availability_rules.buffer,{before:15,after:15});assert.equal(c.scheduler.min_booking_notice,240);assert.equal(c.event_booking.timezone,'Europe/Lisbon');assert.equal(c.participants[0].booking.calendar_id,'calendar-id');assert.equal(c.requires_session_auth,false);assert.equal(c.event_booking.disable_emails,false);assert.deepEqual(c.availability.availability_rules.default_open_hours,[{days:[1,2,3,4,5],start:'9:00',end:'17:00'}]);});
test('publishing uses the owner grant and writable primary calendar; repeated publication updates the same page',async()=>{const f=fixture();const first=await publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher});assert.match(first.url,/^https:\/\/book.nylas.com\/eu\/client\/thrive-/);f.state.scheduling.types[0].duration=60;await publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher});assert.equal(f.configs.length,1);assert.equal(f.configs[0].availability.duration_minutes,60);assert.equal(f.configs[0].participants[0].booking.calendar_id,'real-calendar');assert.equal(f.requests.filter(r=>r.method==='POST').length,1);const status=await schedulerStatus(f.db,'alice',env,f.fetcher);assert.equal(status.pages.discovery.url,first.url);assert.ok(!JSON.stringify(status).includes('grant-owner'));assert.ok(!JSON.stringify(status).includes('secret'));});
test('sync does not publish drafts and unpublishing disables public access without deleting existing bookings',async()=>{const f=fixture();assert.deepEqual(await publishBookingPage(f.db,'alice',env,'discovery',{existingOnly:true,fetcher:f.fetcher}),{skipped:true});assert.equal(f.configs.length,0);await publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher});await publishBookingPage(f.db,'alice',env,'discovery',{remove:true,fetcher:f.fetcher});assert.equal(f.configs[0].requires_session_auth,true);await publishBookingPage(f.db,'alice',env,'discovery',{existingOnly:true,fetcher:f.fetcher});assert.equal(f.configs[0].requires_session_auth,true);assert.equal((await schedulerStatus(f.db,'alice',env,f.fetcher)).pages.discovery.published,false);});
test('missing calendar, paused or foreign types fail closed; owner slugs differ',async()=>{const f=fixture();assert.notEqual(await schedulerSlug('alice','discovery'),await schedulerSlug('bob','discovery'));await assert.rejects(()=>publishBookingPage(f.db,'bob',env,'discovery',{fetcher:f.fetcher}),/Workspace not found/);await assert.rejects(()=>publishBookingPage(f.db,'alice',env,'foreign',{fetcher:f.fetcher}),/Event type not found/);f.state.scheduling.types[0].active=false;await assert.rejects(()=>publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher}),/Enable this event/);f.account.scopes='[]';assert.equal((await schedulerStatus(f.db,'alice',env,f.fetcher)).connection.account.calendar,false);await assert.rejects(()=>publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher}),/Connect a calendar/);});
test('provider failure never returns a published link',async()=>{const f=fixture();const fetcher=async(url,opts)=>opts.method?Response.json({error:{type:'bad_request'}},{status:400}):f.fetcher(url,opts);await assert.rejects(()=>publishBookingPage(f.db,'alice',env,'discovery',{fetcher}),/Nylas could not complete/);});
test('scheduler endpoint rejects unauthenticated requests',async()=>{const f=fixture();const r=await handleScheduler(new Request('https://thrive.example/api/scheduler'),f.db,env,f.fetcher);assert.equal(r.status,401);assert.equal(f.requests.length,0);});


const bookingEvent=(configId,id='event-1',overrides={})=>({id,title:'30-min call',metadata:{source:'scheduler',key5:configId},when:{start_time:Math.floor(Date.now()/1000)+86400,end_time:Math.floor(Date.now()/1000)+88200},status:'confirmed',participants:[{email:'owner@example.com',name:'Owner'},{email:'guest@example.com',name:'Guest'}],location:'Online',html_link:'https://calendar.google.com/calendar/event?eid=event-1',...overrides});

test('status reads existing bookings from this workspace configuration and matches guests to clients',async()=>{
 const f=fixture();await publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher});
 f.state.clients=[{id:'client-1',name:'Guest business',email:'GUEST@example.com'}];
 const events=[bookingEvent('config-1'),bookingEvent('another-workspace','private'),bookingEvent(null,'unrelated',{metadata:{}})];
 const fetcher=async(url,opts)=>{if(!url.includes('/events?'))return f.fetcher(url,opts);assert.equal(opts.method,undefined);const p=new URL(url).searchParams;assert.equal(p.get('calendar_id'),'real-calendar');assert.equal(p.get('metadata_pair'),'key5:config-1');assert.equal(p.get('show_cancelled'),'true');return Response.json({data:events});};
 const status=await schedulerStatus(f.db,'alice',env,fetcher);
 assert.equal(status.meetings.length,1);const m=status.meetings[0];
 assert.equal(m.typeName,'30-min call');assert.equal(m.clientId,'client-1');assert.equal(m.contactEmail,'guest@example.com');assert.equal(m.duration,30);assert.equal(m.status,'scheduled');assert.equal(m.source,'scheduler');assert.equal(m.timeZone,'Europe/Lisbon');assert.equal(m.guests.length,1);
 assert.ok(!JSON.stringify(status).includes('grant-owner'));assert.ok(!JSON.stringify(status).includes('another-workspace'));
 assert.equal(f.state.scheduling.meetings,undefined,'Reads do not create local meetings or invitations');
});

test('booking refresh paginates, deduplicates and reflects reschedules, cancellations and deleted events',async()=>{
 const f=fixture();await publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher});
 const first=bookingEvent('config-1'),second=bookingEvent('config-1','event-2');let phase=0;
 const fetcher=async(url,opts)=>{if(!url.includes('/events?'))return f.fetcher(url,opts);const p=new URL(url).searchParams;if(phase===2)return Response.json({data:[]});if(p.has('page_token'))return Response.json({data:[first,second]});return Response.json({data:[first],next_cursor:'next-page'});};
 const before=await schedulerStatus(f.db,'alice',env,fetcher);assert.equal(before.meetings.length,2);
 first.when.start_time+=86400;first.when.end_time+=86400;second.status='cancelled';phase=1;
 const after=await schedulerStatus(f.db,'alice',env,fetcher);assert.equal(after.meetings.length,2);const updated=after.meetings.find(m=>m.id===before.meetings[0].id);assert.equal(Date.parse(updated.start)-Date.parse(before.meetings[0].start),86400000);assert.equal(after.meetings.filter(m=>m.status==='scheduled').length,1);
 phase=2;assert.deepEqual((await schedulerStatus(f.db,'alice',env,fetcher)).meetings,[]);
});

test('paused booking pages still show their bookings; unrelated configurations are never queried',async()=>{
 const f=fixture();await publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher});f.configs[0].requires_session_auth=true;f.state.scheduling.types[0].active=false;f.configs.push({id:'foreign',slug:await schedulerSlug('bob','discovery')});
 let reads=0;const fetcher=async(url,opts)=>{if(!url.includes('/events?'))return f.fetcher(url,opts);reads++;assert.equal(new URL(url).searchParams.get('metadata_pair'),'key5:config-1');return Response.json({data:[bookingEvent('config-1')]});};
 const status=await schedulerStatus(f.db,'alice',env,fetcher);assert.equal(status.pages.discovery.published,false);assert.equal(status.meetings.length,1);assert.equal(reads,1);
});

test('booking failures and incomplete pagination report an error instead of a misleading empty list',async()=>{
 const f=fixture();await publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher});
 for(const response of [()=>Response.json({error:'unavailable'},{status:503}),()=>Response.json({data:null}),()=>Response.json({data:[],next_cursor:'repeated'})]){
  const fetcher=(url,opts)=>url.includes('/events?')?response():f.fetcher(url,opts);
  await assert.rejects(()=>schedulerStatus(f.db,'alice',env,fetcher),/Nylas could not|Booked meetings/);
 }
});

test('invalid times are ignored, ended bookings leave scheduled view, and unsafe calendar links are omitted',async()=>{
 const f=fixture();await publishBookingPage(f.db,'alice',env,'discovery',{fetcher:f.fetcher});
 const fetcher=(url,opts)=>url.includes('/events?')?Response.json({data:[bookingEvent('config-1','past',{when:{start_time:1000,end_time:2800},html_link:'javascript:alert(1)'}),bookingEvent('config-1','invalid',{when:{start_date:'2026-01-01'}})]}):f.fetcher(url,opts);
 const {meetings}=await schedulerStatus(f.db,'alice',env,fetcher);assert.equal(meetings.length,1);assert.equal(meetings[0].status,'completed');assert.equal(meetings[0].calendarUrl,null);
});
