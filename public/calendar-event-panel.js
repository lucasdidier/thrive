// Drawer for a connected-calendar event: actions, details, guests and description.
// Guests are matched to Thrive clients by email, or by company domain for non-free addresses.
import {freeEmailDomains} from './free-email-domains.js';
import {clientLogo} from './client-logo.js';
import {L,Ln,language} from './i18n.js';

const statusLabel=k=>({accepted:L('Going'),declined:L('Declined'),tentative:L('Maybe'),pending:L('Awaiting reply')})[k];
const statusCount=(k,n)=>({accepted:()=>Ln(n,'{n} going','{n} going'),declined:()=>Ln(n,'{n} declined','{n} declined'),tentative:()=>Ln(n,'{n} maybe','{n} maybe'),pending:()=>Ln(n,'{n} awaiting reply','{n} awaiting reply')})[k]();
const statusTone={accepted:'accepted',declined:'declined',tentative:'planned',pending:'draft'};
const domainOf=email=>String(email||'').split('@')[1]?.toLowerCase()||'';
const initials=text=>String(text||'?').replace(/@.*/,'').split(/[\s._-]+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?';

export function eventClients(state,entry){
 const clients=(state?.clients||[]).filter(c=>!c.archived&&c.email),found=new Map();
 for(const g of [entry.organizer,...(entry.guests||[])].filter(Boolean)){
  const domain=domainOf(g.email),business=domain&&!freeEmailDomains.has(domain);
  const c=clients.find(c=>c.email.toLowerCase()===g.email)||(business?clients.find(c=>domainOf(c.email)===domain):null);
  if(c)found.set(c.id,c);
 }
 return [...found.values()];
}
export function eventTiming(entry,locale=language()){
 if(entry.allDay){const d=new Date(entry.start+'T12:00:00');return {when:L('All day')+' · '+d.toLocaleDateString(locale,{weekday:'long',month:'long',day:'numeric'}),duration:''};}
 const start=new Date(entry.start),end=new Date(entry.end),minutes=Math.max(0,Math.round((end-start)/60000));
 const time=d=>d.toLocaleTimeString(locale,{hour:'numeric',minute:'2-digit'});
 const sameDay=start.toDateString()===end.toDateString();
 const when=`${start.toLocaleDateString(locale,{weekday:'short',month:'short',day:'numeric'})} · ${time(start)} – ${sameDay?time(end):end.toLocaleString(locale,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;
 const duration=minutes<60?L('{n} min',{n:minutes}):minutes%60?L('{h} h {m} min',{h:Math.floor(minutes/60),m:minutes%60}):L('{h} h',{h:Math.floor(minutes/60)});
 return {when,duration};
}
// Plain text in, escaped HTML out, with https links made clickable.
function linkify(text,esc){return esc(text).replace(/https:\/\/[^\s<>"')\]]+/g,url=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${url.length>60?url.slice(0,57)+'…':url}</a>`);}

export function calendarEventPanel(entry,{state,icon,esc,account=''}){
 const {when,duration}=eventTiming(entry),clients=eventClients(state,entry);
 const guests=[...(entry.guests||[])];
 if(entry.organizer&&!guests.some(g=>g.email===entry.organizer.email))guests.unshift({...entry.organizer,status:'accepted'});
 const counts=guests.reduce((n,g)=>(n[g.status]=(n[g.status]||0)+1,n),{});
 const summary=['accepted','tentative','declined','pending'].filter(k=>counts[k]).map(k=>statusCount(k,counts[k])).join(' · ');
 const prop=(symbol,label,value)=>`<div class="record-property"><span>${icon(symbol)}${label}</span><span class="record-static-value">${value}</span></div>`;
 const avatar=c=>`<span class="avatar ${esc(c.color||'sage')}">${clientLogo(c)?`<img src="${esc(clientLogo(c))}" alt="">`:esc(initials(c.name))}</span>`;
 const actions=[
  entry.meeting?`<a class="btn primary" href="${esc(entry.meeting.url)}" target="_blank" rel="noopener noreferrer">${icon('video')}${L('Join {provider}',{provider:esc(entry.meeting.provider)})}</a>`:'',
  entry.calendarUrl?`<a class="btn" href="${esc(entry.calendarUrl)}" target="_blank" rel="noopener noreferrer">${icon('external')}${L('Open in calendar')}</a>`:'',
 ].filter(Boolean).join('');
 return `<div class="dialog-body calendar-event-panel">
 <p class="event-when">${esc(when)}${entry.recurring?` <span class="event-tag">${icon('refresh')}${L('Repeats')}</span>`:''}</p>
 ${actions?`<div class="record-quick-actions">${actions}</div>`:''}
 <h2 class="record-fields-heading">${L('Details')}</h2>
 <div class="record-properties">
  ${duration?prop('time',L('Duration'),esc(duration)):''}
  ${entry.meeting?prop('video',L('Meeting'),`<a href="${esc(entry.meeting.url)}" target="_blank" rel="noopener noreferrer">${esc(entry.meeting.provider)}</a>${entry.meeting.code?` <span class="muted">${esc(entry.meeting.code)}</span>`:''}`):''}
  ${entry.location&&entry.location!==entry.meeting?.url?prop('location',L('Location'),linkify(entry.location,esc)):''}
  ${entry.organizer?prop('user',L('Organizer'),esc(entry.organizer.name||entry.organizer.email)):''}
  ${clients.length?`<div class="record-property"><span>${icon('clients')}${clients.length>1?L('Clients'):L('Client')}</span><div class="record-relation">${clients.map(c=>`<button class="relation-pill" data-action="client" data-id="${esc(c.id)}" title="${esc(c.name)}">${avatar(c)}<span class="relation-name">${esc(c.name)}</span></button>`).join('')}</div></div>`:''}
  ${account?prop('calendar',L('Calendar'),esc(account)):''}
 </div>
 ${guests.length?`<h2 class="record-fields-heading">${L('Guests')} <span class="count">${guests.length}</span></h2>${summary?`<p class="event-guest-summary">${esc(summary)}</p>`:''}
 <ul class="event-guests">${guests.map(g=>`<li><span class="avatar">${esc(initials(g.name||g.email))}</span><span class="event-guest-name"><strong>${esc(g.name||g.email)}</strong>${g.name?`<small>${esc(g.email)}</small>`:''}</span>${entry.organizer?.email===g.email?`<span class="event-tag">${L('Organizer')}</span>`:`<span class="badge ${statusTone[g.status]}"><i></i>${statusLabel(g.status)}</span>`}</li>`).join('')}</ul>`:''}
 ${entry.description?`<h2 class="record-fields-heading">${L('Description')}</h2><div class="event-description">${linkify(entry.description,esc)}</div>`:''}
 </div>`;
}
