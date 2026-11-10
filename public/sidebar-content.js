import {gettingStartedProgress} from './getting-started.js';
import {L,Ln} from './i18n.js';
// Sidebar in the Harvest layout: workspace switcher and collapse toggle on top, navigation,
// Customize, then app-level links, setup progress, and one account card beside notifications.
// Expanded and collapsed share one layout: icons keep their x position, only the width animates.
export function profileAvatar(settings,esc){
 const photo=settings.profilePhoto;
 return `<span class="avatar account-avatar">${photo&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(photo)?`<img src="${esc(photo)}" alt="">`:esc(settings.name.trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2)||'U')}</span>`;
}
const navIcon={overview:'home',proposals:'documents',contracts:'signature'};
const item=(icon,esc,{href,action,label,glyph,current,extra='',attrs=''})=>`${href?`<a href="${href}"`:`<button type="button" data-action="${action}"`} class="app-nav__item${current?' is-active':''}" title="${esc(label)}" ${current?'aria-current="page"':''} ${attrs}>${icon(glyph)}<span class="app-nav__label">${esc(label)}</span>${extra}${href?'</a>':'</button>'}`;

export function sidebarHTML(s,{esc,icon,account={},connection,page,groups,hidden=id=>false,customizing=false,unread=0,shortcut}){
 const business=s.settings.business||L('Workspace'),logo=s.settings.workspaceLogo??s.settings.documentDesign?.logo;
 const current=id=>page===id||page.startsWith(id+'/');
 const steps=gettingStartedProgress(s,connection),done=steps.filter(x=>x.status!=='pending').length;
 const theme=globalThis.document?.documentElement?.dataset.theme||'light';
 const workspaces=account.workspaces||[],active=account.workspaceId||'default';
 const nav=groups.map(([label,items])=>{
  const shown=customizing?items:items.filter(([id])=>!hidden(id));
  if(!shown.length)return '';
  return `<div class="app-nav__group">${label?`<div class="app-nav__group-label">${esc(label)}</div>`:''}${shown.map(([id,text])=>customizing
   ?`<button type="button" class="app-nav__item is-editing${hidden(id)?' is-hidden':''}" data-action="sidebar-visibility" data-id="${id}" aria-pressed="${!hidden(id)}" title="${esc(hidden(id)?L('Show {name}',{name:text}):L('Hide {name}',{name:text}))}">${icon(navIcon[id]||id)}<span class="app-nav__label">${esc(text)}</span><span class="app-nav__eye">${icon(hidden(id)?'eyeOff':'eye')}</span></button>`
   :item(icon,esc,{href:'#'+id,label:text,glyph:navIcon[id]||id,current:current(id)})).join('')}</div>`;
 }).join('');
 return `<div class="app-nav__inner">
 <div class="app-nav__top">
  <button type="button" class="app-nav__brand" popovertarget="workspace-menu" aria-expanded="false" aria-label="${esc(L('{name} workspace menu',{name:business}))}" title="${esc(L('Switch workspace'))}"><img class="app-nav__logo" src="/favicon.svg" width="28" height="28" alt=""><span class="app-nav__wordmark">thrive</span></button>
 </div>
 <div class="app-nav__search"><button type="button" class="app-nav__item app-nav__search-btn" data-action="search" aria-label="${esc(L('Search and quick actions'))}" title="${esc(L('Search and quick actions ({shortcut})',{shortcut}))}">${icon('search')}<span class="app-nav__label">${L('Search')}</span><kbd class="app-nav__label">${shortcut}</kbd></button></div>
 <nav class="app-nav__sections${customizing?' is-customizing':''}" aria-label="${esc(L('Main navigation'))}">${nav}
  <div class="app-nav__customize">${customizing
   ?`<button type="button" class="app-nav__item app-nav__customize-btn" data-action="sidebar-customize-done">${icon('check')}<span class="app-nav__label">${L('Done')}</span></button>`
   :`<button type="button" class="app-nav__item app-nav__customize-btn" data-action="sidebar-customize" title="${esc(L('Customize sidebar'))}">${icon('settings')}<span class="app-nav__label">${L('Customize')}</span></button>`}</div>
 </nav>
 <div class="app-nav__footer">
  <div class="app-nav__bottom-items">
   ${item(icon,esc,{action:'mcp-guide',label:L('Use with AI'),glyph:'sparkles'})}
   ${item(icon,esc,{action:'workspace-settings',label:L('Settings'),glyph:'gear',current:page.startsWith('settings')})}
  </div>
  ${s.settings.gettingStarted?.hidden?'':`<div class="app-nav__setup"><button type="button" class="getting-started-trigger app-nav__setup-btn ${done===6?'is-complete':''}" popovertarget="getting-started-menu" aria-expanded="false" aria-label="${esc(L('Getting started, {done} of {total} steps complete',{done,total:6}))}" title="${esc(L('Getting started'))} · ${done}/6"><span class="getting-started-orbit" aria-hidden="true"></span><span class="app-nav__label getting-started-label">${L('Getting started')}</span><span class="getting-started-count">${done}/6</span></button></div>`}
  <div class="app-nav__account-row">
   <button type="button" class="app-nav__account" popovertarget="account-menu" aria-expanded="false" aria-label="${esc(L('Account menu for {name}',{name:s.settings.name}))}" title="${esc(s.settings.name)} · ${esc(business)}">${profileAvatar(s.settings,esc)}<span class="app-nav__identity app-nav__label"><strong>${esc(s.settings.name)}</strong><small>${esc(business)}</small></span></button>
   <a class="app-nav__bell${current('notifications')?' is-active':''}" href="#notifications" aria-label="${esc(unread?Ln(unread,'Notifications, {n} unread','Notifications, {n} unread'):L('Notifications'))}" title="${esc(L('Notifications'))}">${icon('notifications')}${unread?'<span class="app-nav__dot" aria-hidden="true"></span>':''}</a>
  </div>
 </div>
 </div>
 <button type="button" class="app-nav__toggle" data-sidebar-toggle aria-controls="sidebar" aria-label="${esc(L('Collapse sidebar'))}" title="${esc(L('Collapse sidebar'))}">${icon('sidebar')}</button>
 <div id="workspace-menu" class="workspace-menu app-nav__menu" popover="auto" aria-label="${esc(L('Workspace'))}">
  <div class="app-nav__menu-head"><span class="app-nav__menu-logo">${logo?`<img src="${esc(logo)}" alt="">`:icon('leaf')}</span><span><strong>${esc(business)}</strong><small>${L('Workspace')}</small></span></div>
  ${workspaces.length>1?`<div class="workspace-options">${workspaces.map(w=>`<button data-action="workspace-switch" data-id="${esc(w.id)}" ${w.id===active?'aria-current="true"':''}><span class="workspace-option-icon">${w.logo?`<img src="${esc(w.logo)}" alt="">`:icon('leaf')}</span><span>${esc(w.id===active?business:w.name)}</span>${w.id===active?icon('check'):''}</button>`).join('')}</div><div class="menu-divider"></div>`:''}
  <button data-action="workspace-settings">${icon('gear')}${L('Workspace settings')}</button><button data-action="workspace-new">${icon('plus')}${L('Create workspace')}</button>
 </div>
 <div id="account-menu" class="workspace-menu account-menu app-nav__menu" popover="auto" aria-label="${esc(L('Your account'))}">
  <div class="app-nav__menu-head">${profileAvatar(s.settings,esc)}<span><strong>${esc(s.settings.name)}</strong><small>${esc(account.user?.email||business)}</small></span></div>
  <div class="menu-divider"></div>
  <button data-action="profile">${icon('user')}${L('My profile')}</button>
  <button data-action="sidebar-go" data-href="#settings/notifications">${icon('notifications')}${L('Notification settings')}</button>
  ${account.plan?`<button data-action="sidebar-go" data-href="#account/plan">${icon('card')}${L('Plan & billing')}</button>`:''}
  ${s.settings.gettingStarted?.hidden?`<button data-action="gs-show">${icon('check')}${L('Getting started')}</button>`:''}
  <div class="app-nav__theme" role="group" aria-label="${esc(L('Appearance'))}"><span>${L('Appearance')}</span><div>${[['light',L('Light'),'sun',L('Light theme')],['dark',L('Dark'),'moon',L('Dark theme')]].map(([t,label,glyph,name])=>`<button data-action="sidebar-theme" data-theme="${t}" aria-pressed="${theme===t}" aria-label="${esc(name)}" title="${esc(label)}">${icon(glyph)}</button>`).join('')}</div></div>
  ${account.enabled?`<div class="menu-divider"></div><button data-action="signout">${icon('logout')}${L('Sign out')}</button>`:''}
 </div>
 <div class="getting-started-panel" id="getting-started-menu" popover="auto" aria-labelledby="getting-started-title"><header><div><h2 id="getting-started-title">${done===6?L('You’re all set'):L('Make yourself at home')}</h2></div><button class="icon-btn" popovertarget="getting-started-menu" popovertargetaction="hide" aria-label="${esc(L('Close getting started'))}">${icon('close')}</button></header><div class="getting-started-progress" role="progressbar" aria-label="${esc(L('Getting started progress'))}" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="6">${steps.map(step=>`<span class="${step.status!=='pending'?'done':''}"></span>`).join('')}</div><ul>${steps.map(step=>`<li class="getting-started-step ${step.status}"><span class="getting-started-step-icon feature-icon feature-icon--sm" aria-hidden="true">${icon(step.status==='pending'?step.icon:'check')}</span><button class="getting-started-step-label" data-action="gs-open" data-step="${step.id}">${step.label}${step.status!=='pending'?`<small>${step.status==='complete'?L('Completed'):L('Skipped')}</small>`:''}</button>${step.status==='complete'?`<button class="getting-started-skip" data-action="gs-reset" data-step="${step.id}" aria-label="${esc(L('Mark incomplete: {step}',{step:step.label}))}">${L('Undo')}</button>`:step.status==='pending'?`<button class="getting-started-skip" data-action="gs-complete" data-step="${step.id}" aria-label="${esc(L('Mark complete: {step}',{step:step.label}))}">${L('Done')}</button><button class="getting-started-skip" data-action="gs-skip" data-step="${step.id}" aria-label="${esc(L('Skip: {step}',{step:step.label}))}">${L('Skip')}</button>`:step.status==='skipped'?`<button class="getting-started-skip" data-action="gs-undo" data-step="${step.id}" aria-label="${esc(L('Undo skip: {step}',{step:step.label}))}">${L('Undo')}</button>`:''}</li>`).join('')}</ul><footer><span>${L('{done} of {total} complete',{done,total:6})}</span>${done===6?`<button class="text-btn" data-action="gs-hide">${L('Hide checklist')}</button>`:''}</footer><p class="getting-started-message" role="status" hidden></p></div>`;
}
