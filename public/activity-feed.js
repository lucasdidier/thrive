import {documentActivityPresentation} from './document-labels.js';
import {conversationStatus} from './attention-domain.js';
const attention=new Set(['Invoice paid','Payment recorded','Meeting booked','Event scheduled','Form submitted','Inquiry received','Proposal accepted','Document accepted','Contract signed','Document signed','Document signed (demo)','Client created']);
export const activityKey=n=>n.id||JSON.stringify([n.text,n.detail,n.time]);
export const isAttentionUpdate=n=>attention.has(n.text)||/^(Proposal|Contract|Proposal \+ contract) (accepted|signed(?: \(demo\))?)$/.test(n.text);
export function emailActivity(threads=[]){return threads.flatMap(t=>(t.messages||[]).map(m=>({id:`email:${t.id}:${m.id}`,text:m.direction==='incoming'?'New email':'Email sent',detail:`${m.direction==='incoming'?m.from||'Client':m.to||'Client'} · ${m.subject||t.subject||'(No subject)'}`,subject:m.subject||t.subject||'(No subject)',correspondent:m.direction==='incoming'?m.from||'Client':m.to||'Client',kind:'mail',createdAt:m.date,page:'messages'})));}
export function activityFeed(s,threads=[],notifications=false){
 const emails=notifications?threads.filter(t=>conversationStatus(s,t)==='Needs reply').flatMap(t=>emailActivity([{...t,messages:t.messages.slice(-1)}]).map(n=>({...n,text:'Needs reply',threadId:t.id}))):emailActivity(threads);
 const rows=[...(s.activity||[]).filter(n=>!notifications||(isAttentionUpdate(n)&&n.text!=='Client created')),...emails];
 return rows.map((n,index)=>({...n,index})).sort((a,b)=>{const x=Date.parse(a.createdAt),y=Date.parse(b.createdAt);if(Number.isFinite(x)&&Number.isFinite(y))return y-x||a.index-b.index;if(Number.isFinite(x)!==Number.isFinite(y))return Number.isFinite(x)?-1:1;return a.index-b.index;});
}
export function isRead(s,n){const read=s.settings.readNotifications||[];return read.includes(activityKey(n))||read.includes(JSON.stringify([n.text,n.detail,n.time]));}
export function timelineHTML(rows,{esc,icon,state,notifications=false,empty='No activity yet.'}){return `<div class="account-timeline">${rows.map(n=>{const display=documentActivityPresentation(state,n);const at=n.createdAt&&Number.isFinite(Date.parse(n.createdAt))?new Date(n.createdAt):null;return `<article class="timeline-event"><span class="timeline-marker ${notifications&&!isRead(state,n)?'is-unread':''}" aria-hidden="true">${icon(({payment:'money',client:'clients',document:'documents',project:'projects',note:'note',meeting:'calendar',forms:'forms',mail:'mail',settings:'settings',time:'clock',workflows:'workflows',proposal:'documents',contract:'signature',agreement:'signature'})[display.kind]||'status')}</span><div class="timeline-content"><strong>${esc(n.subject||display.text)}</strong><p>${esc(n.subject?n.text+' · '+(n.correspondent||'').replace(/\s*<[^>]+>/g,'').trim():n.detail)}</p>${n.page?`<button class="text-btn" data-action="${n.threadId?'mail-project-thread':'navigate'}" ${n.threadId?`data-id="${esc(n.threadId)}"`:`data-page="${esc(n.page)}"`}>View email</button>`:''}</div><time ${at?`datetime="${at.toISOString()}" title="${esc(at.toLocaleString())}"`:''}>${esc(at?at.toLocaleDateString(undefined,{month:'short',day:'numeric'}):'Time unavailable')}</time></article>`;}).join('')||`<p class="feed-empty">${esc(empty)}</p>`}</div>`;}

export function activityGroups(rows,now=new Date()){
 const today=new Date(now);today.setHours(0,0,0,0);
 const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
 const buckets=[['Today',[]],['Yesterday',[]],['Earlier',[]],['Undated activity',[]]];
 for(const row of rows){const at=Date.parse(row.createdAt);buckets[!Number.isFinite(at)?3:at>=+today?0:at>=+yesterday?1:2][1].push(row);}
 return buckets.filter(([,items])=>items.length);
}
