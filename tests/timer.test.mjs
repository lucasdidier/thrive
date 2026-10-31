import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {startTimer,stopTimer,discardTimer,activeTimer,timerSeconds,parseDuration,weekDates,localDate} from '../public/timer-domain.js';
import {timeStatus,saveTimeEntry,archiveTimeEntry,unbilledTime} from '../public/time-domain.js';
import {createTimeInvoiceDraft} from '../public/invoice-domain.js';
import {validateWorkspace} from '../server/validation.mjs';
const state=()=>initBilling(upgradeWorkspace(seed()));
const now=new Date('2026-10-31T10:00:00Z').getTime();
const start=(s,actor='person-1')=>startTimer(s,{projectId:s.projects[0].id,task:'Design',note:'',rate:12000,billable:true},actor,now);

test('timer persists timestamps, saves once, and keeps seconds through resume',()=>{
 const s=state(),before=s.time.length,t=start(s);validateWorkspace(s);assert.equal(s.time.length,before);assert.equal(timerSeconds(t,now+90500),90);
 const loaded=JSON.parse(JSON.stringify(s));assert.equal(timerSeconds(activeTimer(loaded,'person-1'),now+3600000),3600);
 const e=stopTimer(s,'person-1',{now:now+90500});assert.equal(e.minutes,2);assert.equal(e.timerSeconds,90);assert.equal(e.task,'Design');assert.equal(e.note,'');assert.equal(s.time.length,before+1);assert.throws(()=>stopTimer(s,'person-1'));validateWorkspace(s);
 startTimer(s,{entryId:e.id},'person-1',now+100000);assert.equal(timeStatus(s,s.time.find(x=>x.id===e.id)),'running');assert.ok(!unbilledTime(s).some(x=>x.id===e.id));
 assert.throws(()=>archiveTimeEntry(s,e.id));assert.throws(()=>saveTimeEntry(s,{...e,minutes:60},e.id));validateWorkspace(s);
 const resumed=stopTimer(s,'person-1',{now:now+130000});assert.equal(resumed.minutes,2);assert.equal(resumed.timerSeconds,120);assert.equal(s.time.length,before+1);validateWorkspace(s);
});
test('one timer per person, separate users, invalid inputs do not mutate',()=>{
 const s=state();start(s);const saved=JSON.stringify(s);assert.throws(()=>start(s));assert.equal(JSON.stringify(s),saved);start(s,'person-2');validateWorkspace(s);assert.equal(s.runningTimers.length,2);
 for(const data of [{projectId:'missing'},{projectId:s.projects[0].id,rate:-1},{projectId:s.projects[0].id,task:'x'.repeat(81)}]){const before=JSON.stringify(s);assert.throws(()=>startTimer(s,data,'person-3',now));assert.equal(JSON.stringify(s),before);}
 const invalid=structuredClone(s);invalid.runningTimers[1].actorId='person-1';assert.throws(()=>validateWorkspace(invalid));
});
test('tracked time invoices only after stopping; claimed entries cannot resume',()=>{
 const s=state();start(s);const e=stopTimer(s,'person-1',{now:now+3600000});startTimer(s,{entryId:e.id},'person-1',now+3600000);
 assert.throws(()=>createTimeInvoiceDraft(s,{entryIds:[e.id],additionalCharge:true}));
 stopTimer(s,'person-1',{now:now+5400000});const draft=createTimeInvoiceDraft(s,{entryIds:[e.id],additionalCharge:true});assert.equal(draft.items[0].amount,18000);assert.match(draft.items[0].description,/Design/);assert.throws(()=>startTimer(s,{entryId:e.id},'person-1',now));validateWorkspace(s);
});
test('long-running timer requires explicit duration and discard keeps prior saved time',()=>{
 const s=state();start(s);const before=JSON.stringify(s);assert.throws(()=>stopTimer(s,'person-1',{now:now+90000000}),/24 hours/);assert.equal(JSON.stringify(s),before);
 const e=stopTimer(s,'person-1',{now:now+90000000,minutes:480});assert.equal(e.minutes,480);validateWorkspace(s);
 startTimer(s,{entryId:e.id},'person-1',now);discardTimer(s,'person-1');assert.equal(s.time.find(t=>t.id===e.id).minutes,480);validateWorkspace(s);
});
test('short timer rounds up once, nonbillable is excluded, and historical entries cannot resume',()=>{
 const s=state();startTimer(s,{projectId:s.projects[0].id,billable:false},'person-1',now);const e=stopTimer(s,'person-1',{now:now+100});assert.equal(e.minutes,1);assert.equal(timeStatus(s,e),'nonbillable');assert.ok(!unbilledTime(s).includes(e));
 assert.throws(()=>startTimer(s,{entryId:e.id},'person-1',now+86400000),/today/);validateWorkspace(s);
});
test('duration input accepts HH:MM or decimal hours; weeks cross month/year boundaries',()=>{
 assert.equal(parseDuration('1:30'),90);assert.equal(parseDuration('1.5'),90);assert.equal(parseDuration('1,5'),90);assert.equal(parseDuration('0:01'),1);assert.equal(parseDuration('24:00'),1440);
 for(const v of ['','0','1:99','-2','25','abc','1e3'])assert.throws(()=>parseDuration(v));
 assert.deepEqual(weekDates('2027-01-01'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);assert.match(localDate(now),/^2026-10-31$/);
});

test('legacy time can resume and running projects cannot be archived',()=>{
 const s=state();const e=saveTimeEntry(s,{projectId:s.projects[0].id,minutes:60,date:localDate(now),note:'Legacy',rate:12000});delete e.billable;
 startTimer(s,{entryId:e.id},'person-1',now);validateWorkspace(s);
 const archived=structuredClone(s);archived.projects.find(p=>p.id===e.projectId).archived=true;assert.throws(()=>validateWorkspace(archived),/Stop running timers/);
 stopTimer(s,'person-1',{now:now+60000});validateWorkspace(s);assert.equal(s.time.find(t=>t.id===e.id).minutes,61);
});
