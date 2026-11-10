import {uid} from './domain.js';
import {L} from './i18n.js';
import {recordCurrency} from './currency.js';
import {saveTimeEntry,timeMinutes,timeClaim,entryRate} from './time-domain.js';

export const localDate=(at=Date.now())=>{const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const activeTimer=(s,actorId)=>(s.runningTimers||[]).find(t=>t.actorId===actorId);
export const timerSeconds=(t,now=Date.now())=>Math.max(0,Math.floor((now-Date.parse(t.startedAt))/1000))+(t.baseSeconds||0);
export const timerClock=seconds=>`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
export function parseDuration(value){
 const text=String(value??'').trim();let minutes;
 if(/^\d{1,2}:[0-5]\d$/.test(text)){const [h,m]=text.split(':').map(Number);minutes=h*60+m;}
 else if(/^\d+(?:[.,]\d{1,4})?$/.test(text))minutes=Math.round(Number(text.replace(',','.'))*60);
 else throw Error(L('Use hours such as 1.5 or a duration such as 1:30.'));
 if(!Number.isSafeInteger(minutes)||minutes<1||minutes>1440)throw Error(L('Enter a duration between 0:01 and 24:00.'));return minutes;
}
export function startTimer(s,data,actorId,now=Date.now()){
 if(!actorId||typeof actorId!=='string'||actorId.length>200)throw Error(L('Sign in before starting a timer.'));
 if(activeTimer(s,actorId))throw Error(L('Stop your current timer before starting another.'));
 const previous=data.entryId?s.time.find(t=>t.id===data.entryId):null;
 if(data.entryId&&!previous)throw Error(L('Time entry not found.'));
 if(previous&&(previous.archived||timeClaim(s,previous.id)||(s.runningTimers||[]).some(t=>t.entryId===previous.id)))throw Error(L('This entry is locked. Start a new timer instead.'));
 if(previous?.actorId&&previous.actorId!==actorId)throw Error(L('You can only resume your own time entries.'));
 if(previous&&previous.date!==localDate(now))throw Error(L('Start a new timer for today instead.'));
 const input=previous?{...previous,rate:entryRate(s,previous)}:data;
 // Reuse entry validation without writing a zero-minute entry or activity record.
 const probe={...s,time:[...s.time],activity:[...(s.activity||[])]};
 const validated=saveTimeEntry(probe,{...input,date:localDate(now),minutes:1});
 const baseSeconds=previous?(previous.timerSeconds??timeMinutes(previous)*60):0;
 if(baseSeconds>=86400)throw Error(L('This entry already contains 24 hours.'));
 const timer={id:uid(),actorId,projectId:validated.projectId,note:validated.note,task:validated.task||'',billable:validated.billable,rate:validated.rate,currency:previous?recordCurrency(s,previous):validated.currency,date:localDate(now),startedAt:new Date(now).toISOString(),baseSeconds,...(previous?{entryId:previous.id}:{})};
 (s.runningTimers??=[]).push(timer);return timer;
}
export function stopTimer(s,actorId,{now=Date.now(),minutes}={}){
 const timer=activeTimer(s,actorId);if(!timer)throw Error(L('No running timer.'));
 const seconds=timerSeconds(timer,now),duration=minutes??Math.max(1,Math.ceil(seconds/60));
 if(duration>1440)throw Error(L('This timer has run for over 24 hours. Review its duration before saving.'));
 // Atomic: validation failures leave the running timer intact.
 const next=structuredClone(s);next.runningTimers=next.runningTimers.filter(t=>t.id!==timer.id);
 const entry=saveTimeEntry(next,{...timer,minutes:duration},timer.entryId);
 entry.actorId=actorId;entry.currency=timer.currency;
 entry.timerSeconds=minutes===undefined?seconds:duration*60;
 Object.assign(s,next);return entry;
}
export function discardTimer(s,actorId){const timer=activeTimer(s,actorId);if(!timer)throw Error(L('No running timer.'));s.runningTimers=s.runningTimers.filter(t=>t.id!==timer.id);return timer;}
export function weekDates(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return Array.from({length:7},(_,i)=>{const day=new Date(d);day.setUTCDate(day.getUTCDate()+i);return day.toISOString().slice(0,10);});}
export function validateTimers(s){
 if(s.runningTimers!==undefined&&(!Array.isArray(s.runningTimers)||s.runningTimers.length>200))throw Error('Invalid running timers.');
 const actors=new Set(),entries=new Set(),ids=new Set();
 for(const t of s.runningTimers||[]){
  if(!t||typeof t.id!=='string'||!t.id||ids.has(t.id)||typeof t.actorId!=='string'||!t.actorId||t.actorId.length>200||actors.has(t.actorId))throw Error(L('Only one timer per person can run at a time.'));
  ids.add(t.id);actors.add(t.actorId);
  const project=s.projects.find(p=>p.id===t.projectId);if(!project||project.archived||project.status==='cancelled'||!s.clients.some(c=>c.id===project.clientId&&!c.archived))throw Error(L('Stop running timers before archiving this project or client.'));
  if(!s.projects.some(p=>p.id===t.projectId)||typeof t.note!=='string'||t.note.length>200||typeof t.task!=='string'||t.task.length>80||typeof t.billable!=='boolean'||!Number.isSafeInteger(t.rate)||t.rate<0||t.rate>100000000||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date||!Number.isFinite(Date.parse(t.startedAt))||!Number.isSafeInteger(t.baseSeconds)||t.baseSeconds<0||t.baseSeconds>=86400||!/^[A-Z]{3}$/.test(t.currency))throw Error('Invalid running timer.');
  if(t.entryId){const entry=s.time.find(e=>e.id===t.entryId);if(!entry||entry.archived||timeClaim(s,entry.id)||entries.has(entry.id)||entry.projectId!==t.projectId||entry.date!==t.date||recordCurrency(s,entry)!==t.currency||entryRate(s,entry)!==t.rate||entry.note!==t.note||(entry.billable!==false)!==t.billable||String(entry.task||'')!==t.task||(entry.actorId&&entry.actorId!==t.actorId)||t.baseSeconds!==(entry.timerSeconds??timeMinutes(entry)*60))throw Error(L('Running time is locked until its timer stops.'));entries.add(entry.id);}
 }
}
