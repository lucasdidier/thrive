// "Coming soon": a pocket-size Thrive for the planned iOS and Android app. Deliberately small:
// today's timer and list, the week's time, and what clients did. Same fictional studio as the rest
// of the page. Nothing here talks to a server.
import {icon} from './app-icons.js';

const I=name=>icon(name,'m-i');
const chip=(tone,text)=>`<span class="m-chip ${tone}">${text}</span>`;
const tile=glyph=>`<span class="p-tile">${I(glyph)}</span>`;
const two=(title,sub)=>`<span class="p-two"><b>${title}</b><span>${sub}</span></span>`;
const row=(lead,title,sub,end='')=>`<div class="p-row">${lead}${two(title,sub)}${end}</div>`;
const pad=n=>String(n).padStart(2,'0');
const clock=s=>`${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`;
const short=s=>`${Math.floor(s/3600)}:${pad(Math.floor(s/60)%60)}`;

// Monday to Friday, in hours. Friday is today.
const week=[['M',6.5],['T',7.2],['W',5.1],['T',6.6],['F',1.2]];

export const screens={
 today:()=>`<p class="p-date">Friday, November 13</p><h3 class="p-h">Good morning, Alex</h3>
  <div class="p-timer" data-timer>
   <span class="p-label"><i class="p-live" aria-hidden="true"></i>${two('Development','Orbit website')}</span>
   <b class="p-clock" data-clock>01:12:13</b>
   <button type="button" class="p-round hot" data-act="timer" aria-label="Stop the timer">${I('stop')}</button>
  </div>
  <p class="p-sec">Today</p>
  <div class="p-list">
   ${row('<span class="p-at">9:30</span>','Discovery call','Northstar Labs · 30 min')}
   ${row('<span class="p-at">11:00</span>','Packaging workshop','Ember Coffee · 1 h')}
  </div>
  <p class="p-sec">Waiting on clients</p>
  <div class="p-list">
   ${row(tile('invoices'),'€1,800','Juniper Studio',chip('bad','Overdue'))}
   ${row(tile('documents'),'Proposal','Northstar Labs',chip('warn','Awaiting'))}
  </div>`,
 time:()=>`<p class="p-date">This week</p><h3 class="p-h"><span data-week>26:40</span> tracked</h3>
  <div class="p-bars" aria-hidden="true">${week.map(([day,h],i)=>`<span${i===week.length-1?' class="is-today" data-today':''} style="--h:${(h/8).toFixed(3)}"><i></i>${day}</span>`).join('')}</div>
  <div class="p-sechead"><p class="p-sec">Today</p><button type="button" class="p-add hot" data-act="add">${I('plus')}Add time</button></div>
  <div class="p-list" data-entries>
   ${row(tile('time'),'Development','Orbit website','<b class="p-dur" data-clock-short>1:12</b>')}
   ${row(tile('time'),'Brand review','Juniper Studio','<b class="p-dur">0:45</b>')}
  </div>`,
 activity:()=>`<p class="p-date">Activity</p><h3 class="p-h">What clients did</h3>
  <div class="p-list p-feed">
   ${[['signature','Sophie Chen signed','Brand agreement · 2 min',true],['invoices','Juniper Studio paid','€2,400 · INV-003 · 1 h',true],['scheduling','Priya Shah booked a call','Thu, Nov 19 at 14:00 · 3 h'],['documents','Orbit accepted','Website proposal · Yesterday']]
    .map(([glyph,title,sub,unread])=>`<button type="button" class="p-row${unread?' is-unread':''}"${unread?' data-act="read"':''}>${tile(glyph)}${two(title,sub)}${unread?'<i class="p-dot" aria-label="Unread"></i>':''}</button>`).join('')}
  </div>
  <button type="button" class="p-link" data-act="readall">Mark all as read</button>`,
};

export function mountPhoneApp(root,{auto:autoplay=true}={}){
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const tabs=[...root.querySelectorAll('[role=tab]')],panels=tabs.map(t=>document.getElementById(t.getAttribute('aria-controls')));
 panels.forEach(p=>{p.innerHTML=screens[p.dataset.screen]();});
 root.classList.add('is-live');

 let current=0,inView=false,hovering=false,auto=autoplay&&!reduce.matches,timer=0;
 const show=(i,focus)=>{
  current=i;
  tabs.forEach((t,j)=>{const on=j===i;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;panels[j].hidden=!on;});
  if(focus)tabs[i].focus();
 };
 const stopAuto=()=>{auto=false;clearInterval(timer);};
 // Until the visitor touches the phone, it moves through its screens on its own while on screen.
 if(auto)timer=setInterval(()=>{if(inView&&!hovering&&!document.hidden)show((current+1)%tabs.length);},4600);
 tabs.forEach((t,i)=>{
  t.addEventListener('click',()=>{stopAuto();show(i);});
  t.addEventListener('keydown',e=>{const d={ArrowRight:1,ArrowLeft:-1}[e.key];if(d){e.preventDefault();stopAuto();show((i+d+tabs.length)%tabs.length,true);}});
 });
 root.addEventListener('pointerdown',stopAuto);
 root.addEventListener('pointerenter',()=>{hovering=true;});root.addEventListener('pointerleave',()=>{hovering=false;});

 // One running entry, shown on Today and on Time.
 let seconds=4333,running=true,added=false;
 const weekBase=26*3600+40*60-seconds;
 const paint=()=>{
  root.querySelectorAll('[data-clock]').forEach(c=>{c.textContent=clock(seconds);});
  root.querySelectorAll('[data-clock-short]').forEach(c=>{c.textContent=short(seconds);});
  const total=weekBase+seconds+(added?1800:0);root.querySelector('[data-week]').textContent=short(total);
  root.querySelector('[data-today]')?.style.setProperty('--h',((seconds+(added?1800:0)+2700)/3600/8).toFixed(3));
 };
 setInterval(()=>{if(running&&inView&&!document.hidden){seconds++;paint();}},1000);

 const toast=text=>{root.querySelector('.p-toast')?.remove();const t=document.createElement('div');t.className='p-toast';t.setAttribute('role','status');t.innerHTML=`${I('check')}<span>${text}</span>`;root.querySelector('.p-app').append(t);setTimeout(()=>t.remove(),2600);};
 const badge=root.querySelector('[data-badge]');
 const unread=()=>{const n=root.querySelectorAll('.p-row.is-unread').length;badge.textContent=n;badge.hidden=!n;};
 const read=row=>{row.classList.remove('is-unread');row.removeAttribute('data-act');row.querySelector('.p-dot')?.setAttribute('aria-label','Read');unread();};

 const acts={
  timer:b=>{
   running=!running;
   b.innerHTML=I(running?'stop':'play');b.setAttribute('aria-label',running?'Stop the timer':'Start the timer');
   root.querySelector('[data-timer]').classList.toggle('is-stopped',!running);
   if(!running)toast(`Saved ${short(seconds)} to Orbit website`);
  },
  add:b=>{
   if(added)return;added=true;b.disabled=true;b.innerHTML=`${I('check')}Added`;
   const list=root.querySelector('[data-entries]');list.insertAdjacentHTML('beforeend',row(tile('time'),'Client call','Northstar Labs','<b class="p-dur">0:30</b>'));
   list.lastElementChild.classList.add('p-new');paint();toast('Saved 0:30 to Northstar Labs');
  },
  read:b=>read(b),
  readall:()=>root.querySelectorAll('.p-row.is-unread').forEach(read),
 };
 root.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;b.classList.remove('hot');acts[b.dataset.act]?.(b);});
 show(0);paint();unread();
 return {setInView(on){inView=on;root.classList.toggle('in-view',on);},show};
}
