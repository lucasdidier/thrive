import {L} from './i18n.js';
// Shared related-record lists for record pages: one row anatomy, one empty state.
// Callers pass pre-escaped HTML for subtitle/value/status; titles are escaped here.
export function createRelatedList({icon,esc}){
 const row=r=>`<button type="button" class="rel-row" data-action="${r.action}" data-id="${esc(r.id)}"${r.attrs?' '+r.attrs:''}><span class="rel-icon feature-icon feature-icon--md">${icon(r.icon)}</span><span class="rel-main"><strong>${esc(r.title)}</strong>${r.subtitle?`<small>${r.subtitle}</small>`:''}</span><span class="rel-value">${r.value??''}</span><span class="rel-status">${r.status||''}</span><span class="rel-chevron">${icon('chevron')}</span></button>`;
 const empty=e=>`<div class="rel-empty"><span class="rel-empty-icon feature-icon feature-icon--lg">${icon(e.icon)}</span><h3>${esc(e.title)}</h3>${e.text?`<p>${esc(e.text)}</p>`:''}${e.action||''}</div>`;
 const summary=items=>items.length?`<div class="rel-summary">${items.map(([label,value])=>`<span>${esc(label)} <strong>${value}</strong></span>`).join('')}</div>`:'';
 function section({title,rows,action='',empty:e,summary:items=[],note=''}){
  const list=rows.length?`<div class="rel-list">${rows.map(row).join('')}${summary(items)}</div>`:empty(e);
  return `<section class="rel-section"><header class="rel-head"><h2>${esc(title)}${rows.length?`<span class="rel-count">${rows.length}</span>`:''}</h2>${rows.length?action:''}</header>${note}${list}</section>`;
 }
 return {row,empty,section};
}

// "18h 30m" reads as effort; "18:30" reads as a time of day.
export function hoursMinutes(minutes){const m=Math.max(0,Math.round(Number(minutes)||0)),h=Math.floor(m/60),r=m%60;return h&&r?L('{h}h {m}m',{h,m:r}):h?L('{h}h',{h}):L('{m}m',{m:r});}

