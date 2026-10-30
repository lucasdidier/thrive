import test from 'node:test';
import assert from 'node:assert/strict';
import {saveClient} from '../public/domain.js';
import {createJourneyUI} from '../public/journey-ui.js';
import {createSchedulingUI} from '../public/scheduling-ui.js';

const flush=async()=>{for(let n=0;n<8;n++)await new Promise(resolve=>setImmediate(resolve));};
const external={id:'scheduler-booking',source:'scheduler',typeId:'discovery',typeName:'Booked discovery',start:'2030-11-09T09:00:00Z',end:'2030-11-09T09:30:00Z',duration:30,timeZone:'Europe/Lisbon',status:'scheduled',clientId:null,contactName:'New guest',contactEmail:'guest@example.com',guests:[{name:'New guest',email:'guest@example.com'}],calendarUrl:'https://calendar.google.com/calendar/event?eid=example'};
function harness(){
 const originals={fetch:globalThis.fetch,document:globalThis.document,window:globalThis.window};
 let response={connection:{account:{calendar:true,email:'owner@example.com'}},pages:{},meetings:[external]},failure=false,rows=[],reads=0;
 const state={clients:[],settings:{},scheduling:{timeZone:'UTC',types:[],meetings:[]}},screens=[],listeners={},prefills=[],viewed=[];
 globalThis.fetch=async()=>{reads++;return failure?Response.json({error:'Calendar unavailable'},{status:502}):Response.json(response);};
 globalThis.document={hidden:false,querySelector:()=>null};
 globalThis.window={addEventListener(type,fn){listeners[type]=fn;},setInterval(fn){listeners.interval=fn;}};
 const ui=createSchedulingUI({createClient:data=>prefills.push(data),viewClient:id=>viewed.push(id),getState:()=>state,getPage:()=> 'scheduling',bulk:{use(){},reset(){}},listView:{use(config){rows=config.rows;return rows;},visibleRows:()=>rows,columns:()=>[],toolbar:()=>'',table:({cell,tail=[],empty})=>rows.length?rows.map(r=>['typeName','client','followupStatus'].map(k=>cell(r,k)).join('')+tail.map(t=>t.cell(r)).join('')).join(''):empty},render(){},save(){throw Error('Must not save external calendar bookings');},toast(){},open:(title,html,options)=>screens.push({title,html,footer:options?.footer}),dialog:{open:false},btn:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,icon:()=>'',esc:value=>String(value??'').replaceAll('<','&lt;'),badge:value=>value,avatar:()=>''});
 return{ui,state,screens,listeners,prefills,viewed,rows:()=>rows,reads:()=>reads,set(next){response=next;},fail(){failure=true;},restore(){Object.assign(globalThis,originals);}};
}

test('public bookings appear on first scheduling visit alongside workspace meetings',async()=>{
 const h=harness();try{
  h.state.scheduling.meetings=[{...external,id:'local',source:undefined,typeName:'Workspace meeting'}];
  assert.match(h.ui.page(),/Refreshing bookings/);await flush();const html=h.ui.page();
  assert.equal(h.rows().length,2);assert.match(html,/Booked discovery/);assert.match(html,/New guest/);assert.match(html,/guest@example.com/);assert.doesNotMatch(html,/data-action="client" data-id="null"/);
  h.ui.handleClick('meeting',{dataset:{id:external.id}});
  assert.match(h.screens.at(-1).html,/New guest/);assert.match(h.screens.at(-1).footer,/Open in calendar/);
  assert.doesNotMatch(h.screens.at(-1).html,/mail-calendar-review|meeting-notes-form|meeting-complete|meeting-cancel/);
  assert.equal(h.state.scheduling.meetings.length,1);
 }finally{h.restore();}
});

test('refresh replaces provider bookings after reschedule or cancellation without duplicates',async()=>{
 const h=harness();try{
  h.ui.page();await flush();h.ui.page();
  h.set({connection:{account:{calendar:true}},pages:{},meetings:[{...external,status:'cancelled',start:'2030-11-10T09:00:00Z'}]});
  h.ui.handleClick('scheduler-refresh',{dataset:{}});await flush();h.ui.page();
  assert.equal(h.rows().length,1);assert.equal(h.rows()[0].status,'cancelled');assert.equal(h.rows()[0].start,'2030-11-10T09:00:00Z');
  h.set({connection:{account:null},pages:{},meetings:[]});h.ui.handleClick('scheduler-refresh',{dataset:{}});await flush();h.ui.page();assert.equal(h.rows().length,0);
 }finally{h.restore();}
});

test('a failed refresh preserves known bookings and exposes the failure',async()=>{
 const h=harness();try{
  h.ui.page();await flush();h.fail();h.ui.handleClick('scheduler-refresh',{dataset:{}});await flush();
  const html=h.ui.page();assert.match(html,/Calendar unavailable/);assert.match(html,/Booked discovery/);assert.equal(h.reads(),2);
 }finally{h.restore();}
});

test('a recent refresh is reused on focus and interval checks',async()=>{
 const h=harness();try{h.ui.page();await flush();h.listeners.focus();h.listeners.interval();await flush();assert.equal(h.reads(),1);}finally{h.restore();}
});

for(const status of ['scheduled','completed'])test(`${status} meetings offer a prefilled client form and reuse the saved client`,async()=>{
 const h=harness();try{
  h.set({connection:{account:null},pages:{},meetings:[{...external,status}]});
  h.ui.page();await flush();assert.match(h.ui.page(),/Create client/);
  h.ui.handleClick('meeting-client',{dataset:{id:external.id,guest:'0'}});
  assert.deepEqual(h.prefills,[{type:'individual',name:'New guest',contact:'New guest',email:'guest@example.com'}]);
  assert.equal(h.state.clients.length,0,'Opening the form must not save a client');
  h.state.activity=[];const c=saveClient(h.state,h.prefills[0]);
  const html=h.ui.page();assert.match(html,/View client/);assert.doesNotMatch(html,/Create client/);assert.equal(h.rows()[0].clientId,c.id);
  h.ui.handleClick('meeting-client',{dataset:{id:external.id,guest:'0'}});assert.deepEqual(h.viewed,[c.id]);assert.equal(h.prefills.length,1);
 }finally{h.restore();}
});

test('guest actions select the right attendee and recognize archived clients by normalized email',async()=>{
 const h=harness();try{
  h.state.clients=[{id:'existing',name:'Existing guest',email:' GUEST@EXAMPLE.COM ',archived:true}];
  h.set({connection:{account:null},pages:{},meetings:[{...external,guests:[...external.guests,{name:'Second guest',email:'second@example.com'}]}]});
  h.ui.page();await flush();const html=h.ui.page();assert.match(html,/View client · New guest/);assert.match(html,/Create client · Second guest/);
  h.ui.handleClick('meeting-client',{dataset:{id:external.id,guest:'0'}});assert.deepEqual(h.viewed,['existing']);
  h.ui.handleClick('meeting-client',{dataset:{id:external.id,guest:'1'}});assert.equal(h.prefills[0].email,'second@example.com');assert.equal(h.prefills[0].name,'Second guest');
 }finally{h.restore();}
});

test('missing names remain editable and the reusable client form escapes prefilled values',async()=>{
 const h=harness();try{
  h.set({connection:{account:null},pages:{},meetings:[{...external,guests:[{name:'guest@example.com',email:'guest@example.com'}]}]});h.ui.page();await flush();
  h.ui.handleClick('meeting-client',{dataset:{id:external.id}});assert.equal(h.prefills[0].name,'');
  let html='';const journey=createJourneyUI({getState:()=>h.state,open:(_title,body)=>{html=body;},esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),btn:()=>''});
  journey.clientForm(undefined,{...h.prefills[0],name:'Guest "<name>'});
  assert.match(html,/name="name" value="Guest &quot;&lt;name>"/);assert.match(html,/name="email" value="guest@example.com"/);assert.match(html,/value="individual" selected/);assert.match(html,/data-id=""/);assert.equal(h.state.clients.length,0);
 }finally{h.restore();}
});
