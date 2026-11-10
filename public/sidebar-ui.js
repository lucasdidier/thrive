import {navigateActionMenu} from './menu-keyboard.js';
import {L} from './i18n.js';
// Collapse state, toggle and sidebar menus. The motion itself is a CSS width transition
// (sidebar.css): icons keep their position, so there is nothing to choreograph here.
export function initSidebarUI(storageKey){
 const root=document.documentElement,key=storageKey+':sidebar-collapsed';
 try{root.dataset.sidebarCollapsed=localStorage.getItem(key)==='true'?'true':'false';}catch{root.dataset.sidebarCollapsed='false';}
 root.dataset.inputModality='pointer';
 document.addEventListener('pointerdown',()=>{root.dataset.inputModality='pointer';},true);
 document.addEventListener('keydown',e=>{if(['Tab','Enter',' ','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key))root.dataset.inputModality='keyboard';},true);
 // Transitions start after the first paint so a saved collapsed state never animates on load.
 globalThis.requestAnimationFrame?.(()=>requestAnimationFrame(()=>{root.dataset.sidebarReady='true';}));
 const collapsed=()=>root.dataset.sidebarCollapsed==='true';
 const popovers=['workspace-menu','account-menu','getting-started-menu'];
 function position(panel){
  const trigger=document.querySelector(`[popovertarget="${panel.id}"]:not([popovertargetaction])`);if(!trigger)return;
  const r=trigger.getBoundingClientRect(),above=panel.id!=='workspace-menu';
  panel.style.left=`${Math.max(12,Math.min(r.left,innerWidth-panel.offsetWidth-12))}px`;
  panel.style.top=`${Math.max(12,Math.min(above?r.top-panel.offsetHeight-8:r.bottom+8,innerHeight-panel.offsetHeight-12))}px`;
 }
 function sync(){
  const button=document.querySelector('[data-sidebar-toggle]'),label=collapsed()?L('Expand sidebar'):L('Collapse sidebar');
  if(button){button.setAttribute('aria-label',label);button.setAttribute('title',label);button.setAttribute('aria-expanded',String(!collapsed()));}
 }
 function apply(next){
  document.querySelectorAll?.('#sidebar [popover]:popover-open').forEach(p=>p.hidePopover());
  root.dataset.sidebarCollapsed=String(next);sync();
  try{localStorage.setItem(key,String(next));}catch{}
 }
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-sidebar-toggle]')){e.preventDefault();apply(!collapsed());return;}
  // Menu items close their menu, except the appearance toggle: it stays open so both themes can be compared.
  for(const id of ['workspace-menu','account-menu']){const item=e.target.closest(`#${id} [data-action],#${id} a`);if(item&&item.dataset?.action!=='sidebar-theme')document.getElementById(id)?.hidePopover();}
 },true);
 document.addEventListener('toggle',e=>{if(!popovers.includes(e.target.id))return;document.querySelector(`[popovertarget="${e.target.id}"]:not([popovertargetaction])`)?.setAttribute('aria-expanded',String(e.newState==='open'));if(e.newState==='open')position(e.target);},true);
 document.addEventListener('keydown',e=>{
  const panel=e.target.closest?.('#workspace-menu,#account-menu,#getting-started-menu');
  if(panel)navigateActionMenu(e,panel,{trigger:document.querySelector(`[popovertarget="${panel.id}"]:not([popovertargetaction])`),close:()=>panel.hidePopover()});
 });
 if(typeof window!=='undefined')window.addEventListener('resize',()=>document.querySelectorAll('#sidebar [popover]:popover-open').forEach(position));
 return {sync,toggle:()=>apply(!collapsed())};
}
