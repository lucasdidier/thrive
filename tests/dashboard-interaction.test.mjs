import test from 'node:test';
import assert from 'node:assert/strict';
import {createDashboard} from '../public/dashboard-ui.js';
import {emptyWorkspace} from '../server/account-workspace.mjs';
import {calendarDay,localDateKey} from '../public/dashboard-domain.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 const original={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,fetch:globalThis.fetch,FormData:globalThis.FormData};
 const handlers={},state=emptyWorkspace({name:'Alex Morgan'}),requests=[],opened=[];let html='',rejectRequest=false;
 const day=calendarDay().start;
 const events=Array.from({length:5},(_,i)=>({id:`e${i}`,title:`Meeting ${i}`,start:new Date(+day+(9+i)*3600000).toISOString(),end:new Date(+day+(10+i)*3600000).toISOString()}));
 globalThis.document={querySelector:()=>null,getElementById:()=>null,addEventListener(type,fn){(handlers[type]??=[]).push(fn);}};
 globalThis.window={addEventListener(){}};globalThis.localStorage={getItem:()=>null,setItem(){}};
 globalThis.FormData=class {constructor(form){return Object.entries(form.values);}};
 globalThis.fetch=async(_url,options)=>{if(rejectRequest)throw Error('Calendar temporarily unavailable.');if(!options.body)return Response.json({connection:{provider:'nylas',account:{calendar:true}}});const body=JSON.parse(options.body);requests.push(body);return Response.json({events:body.start===day.toISOString()?events:[]});};
 const ui=createDashboard({storageKey:'test',recentActivity:empty=>empty,getState:()=>state,getPage:()=> 'overview',render(){html=ui.page();},icon:()=>'',esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),btn:()=>'',badge:()=>'',open:(...args)=>opened.push(args)});
 const dispatch=(type,target)=>handlers[type]?.forEach(fn=>fn({target,preventDefault(){}}));
 return {state,requests,opened,get html(){return html;},render(){html=ui.page();},click(action){dispatch('click',{closest:selector=>selector==='[data-dashboard]'?{dataset:{dashboard:action}}:null});},event(id){dispatch('click',{closest:selector=>selector==='[data-calendar-event]'?{dataset:{calendarEvent:id}}:null});},range(value){dispatch('change',{id:'dashboard-range',value,dataset:{}});},submit(values){const error={textContent:''};dispatch('submit',{id:'dashboard-custom-range',values,querySelector:()=>error});return error;},reject(){rejectRequest=true;},restore(){Object.assign(globalThis,original);}};
}
test('daily calendar fetches one local day, paginates every event and navigates without nested scrolling',async()=>{
 const h=harness();try{
 h.render();await flush();assert.equal(h.requests.length,1);assert.equal(h.requests[0].start,calendarDay().start.toISOString());assert.equal(h.requests[0].end,calendarDay().end.toISOString());
 assert.match(h.html,/Meeting 0/);assert.doesNotMatch(h.html,/Meeting 4/);
 h.click('events-next');assert.match(h.html,/Meeting 4/);assert.doesNotMatch(h.html,/Meeting 0/);assert.equal(h.requests.length,1);
 h.event('e4');assert.equal(h.opened[0][0],'Meeting 4');
 h.click('next');await flush();assert.equal(h.requests.at(-1).start,calendarDay(1).start.toISOString());assert.match(h.html,/No events this day/);
 h.click('today');await flush();assert.match(h.html,/Meeting 0/);assert.doesNotMatch(h.html,/Meeting 4/);
 h.reject();h.click('refresh');await flush();assert.match(h.html,/Calendar temporarily unavailable/);assert.match(h.html,/Try again/);
 }finally{h.restore();}
});
test('totals selector changes actual metrics, supports custom dates, validates ranges and returns to All time',async()=>{
 const h=harness();try{
 h.state.time=[{date:localDateKey(new Date()),minutes:60},{date:'2020-01-01',minutes:120}];h.render();await flush();assert.match(h.html,/3:00/);
 h.range('month');assert.match(h.html,/1:00/);assert.doesNotMatch(h.html,/3:00/);
 h.range('custom');assert.match(h.html,/dashboard-custom-range/);
 assert.match(h.submit({start:'2020-01-02',end:'2020-01-01'}).textContent,/valid start and end/);
 h.submit({start:'2020-01-01',end:'2020-01-01'});assert.match(h.html,/2:00/);
 h.range('all');assert.match(h.html,/3:00/);assert.doesNotMatch(h.html,/<form id="dashboard-custom-range"/);
 }finally{h.restore();}
});
