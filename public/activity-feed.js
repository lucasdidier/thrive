import {activityTarget} from './activity-target.js';
import {documentActivityPresentation} from './document-labels.js';
import {conversationStatus} from './attention-domain.js';
import {L,language} from './i18n.js';
const attention=new Set(['Invoice paid','Payment recorded','Meeting booked','Event scheduled','Form submitted','Inquiry received','Proposal accepted','Document accepted','Contract signed','Document signed','Document signed (demo)','Client created']);
export const activityKey=n=>n.id||JSON.stringify([n.text,n.detail,n.time]);
export const isAttentionUpdate=n=>attention.has(n.text)||/^(Proposal|Contract|Proposal \+ contract) (accepted|signed(?: \(demo\))?)$/.test(n.text);
export function emailActivity(threads=[]){return threads.flatMap(t=>(t.messages||[]).map(m=>({id:`email:${t.id}:${m.id}`,text:m.direction==='incoming'?'New email':'Email sent',detail:`${m.direction==='incoming'?m.from||L('Client'):m.to||L('Client')} · ${m.subject||t.subject||L('(No subject)')}`,subject:m.subject||t.subject||L('(No subject)'),correspondent:m.direction==='incoming'?m.from||L('Client'):m.to||L('Client'),kind:'mail',threadId:t.id,createdAt:m.date,page:'messages'})));}
export function activityFeed(s,threads=[],notifications=false){
 const emails=notifications?threads.filter(t=>conversationStatus(s,t)==='Needs reply').flatMap(t=>emailActivity([{...t,messages:t.messages.slice(-1)}]).map(n=>({...n,text:'Needs reply',threadId:t.id}))):emailActivity(threads);
 const rows=[...(s.activity||[]).filter(n=>!notifications||(isAttentionUpdate(n)&&n.text!=='Client created')),...emails];
 return rows.map((n,index)=>({...n,index})).sort((a,b)=>{const x=Date.parse(a.createdAt),y=Date.parse(b.createdAt);if(Number.isFinite(x)&&Number.isFinite(y))return y-x||a.index-b.index;if(Number.isFinite(x)!==Number.isFinite(y))return Number.isFinite(x)?-1:1;return a.index-b.index;});
}
export function isRead(s,n){const read=s.settings.readNotifications||[];return read.includes(activityKey(n))||read.includes(JSON.stringify([n.text,n.detail,n.time]));}
// Email rows carry fixed English text (it is compared elsewhere); show it in the workspace's language.
const emailText=text=>({'New email':L('New email'),'Email sent':L('Email sent'),'Needs reply':L('Needs reply')})[text]??text;
export function timelineHTML(rows,{esc,icon,state,notifications=false,empty=L('No activity yet.')}){return `<div class="account-timeline">${rows.map(n=>{const display=documentActivityPresentation(state,n),target=activityTarget(state,n);const at=n.createdAt&&Number.isFinite(Date.parse(n.createdAt))?new Date(n.createdAt):null;return `<button type="button" class="timeline-event timeline-event-link" data-action="${esc(target.action)}" ${target.id?`data-id="${esc(target.id)}"`:`data-page="${esc(target.page)}"`}><span class="timeline-marker feature-icon feature-icon--sm ${notifications&&!isRead(state,n)?'is-unread':''}" aria-hidden="true">${icon(({payment:'money',client:'clients',document:'documents',project:'projects',note:'note',meeting:'calendar',forms:'forms',mail:'mail',settings:'settings',time:'time',workflows:'workflows',proposal:'documents',contract:'signature',agreement:'signature'})[/^Time (logged|entry)/.test(n.text||'')?'time':display.kind]||'status')}</span><span class="timeline-content"><strong>${esc(n.subject||display.text)}</strong><span class="timeline-detail">${esc(n.subject?emailText(n.text)+' · '+(n.correspondent||'').replace(/\s*<[^>]+>/g,'').trim():n.detail)}</span></span><time ${at?`datetime="${at.toISOString()}" title="${esc(at.toLocaleString(language(),{dateStyle:'medium',timeStyle:'short'}))}"`:''}>${esc(at?at.toLocaleDateString(language(),{month:'short',day:'numeric'}):'')}</time></button>`;}).join('')||`<p class="feed-empty">${esc(empty)}</p>`}</div>`;}

export function activityGroups(rows,now=new Date()){
 const today=new Date(now);today.setHours(0,0,0,0);
 const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
 const buckets=[[L('Today'),[]],[L('Yesterday'),[]],[L('Earlier'),[]],[L('Undated activity'),[]]];
 for(const row of rows){const at=Date.parse(row.createdAt);buckets[!Number.isFinite(at)?3:at>=+today?0:at>=+yesterday?1:2][1].push(row);}
 return buckets.filter(([,items])=>items.length);
}
