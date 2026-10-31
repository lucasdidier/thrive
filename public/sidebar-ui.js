import {createSidebarMotion} from './sidebar-motion.js';
export function initSidebarUI(storageKey){
 const root=document.documentElement,key=storageKey+':sidebar-collapsed';
 try{root.dataset.sidebarCollapsed=localStorage.getItem(key)==='true'?'true':'false';}catch{root.dataset.sidebarCollapsed='false';}
 let pinnedCollapsed=root.dataset.sidebarCollapsed==='true',inside=false;
 const motion=createSidebarMotion(root);
 root.dataset.inputModality='pointer';
 document.addEventListener('pointerdown',()=>{root.dataset.inputModality='pointer';},true);
 document.addEventListener('keydown',e=>{if(['Tab','Enter',' ','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){root.dataset.inputModality='keyboard';motion.cancel();}},true);
 const desktop=()=>matchMedia('(min-width:651px)').matches;
 const popovers=['workspace-menu','account-menu','getting-started-menu'];
 function position(panel){
  const trigger=document.querySelector(`[popovertarget="${panel.id}"]:not([popovertargetaction])`);if(!trigger)return;
  const r=trigger.getBoundingClientRect(),above=panel.id!=='workspace-menu'&&desktop();
  panel.style.left=`${Math.max(12,Math.min(r.left,innerWidth-panel.offsetWidth-12))}px`;
  panel.style.top=`${Math.max(12,Math.min(above?r.top-panel.offsetHeight-8:r.bottom+8,innerHeight-panel.offsetHeight-12))}px`;
 }
 function apply(collapsed){motion.run(()=>{pinnedCollapsed=collapsed;root.dataset.sidebarPeek='false';root.dataset.sidebarCollapsed=String(collapsed);sync();});try{localStorage.setItem(key,String(collapsed));}catch{}document.querySelectorAll?.('#sidebar [popover]:popover-open').forEach(position);}
 function sync(){const button=document.querySelector('[data-sidebar-toggle]'),collapsed=pinnedCollapsed;if(button){button.setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');button.setAttribute('title',collapsed?'Expand sidebar':'Collapse sidebar');button.setAttribute('aria-expanded',String(!collapsed));}}
 document.addEventListener('click',e=>{const toggle=e.target.closest('[data-sidebar-toggle]');if(toggle){e.preventDefault();e.stopImmediatePropagation();apply(!pinnedCollapsed);return;}if(desktop()&&root.dataset.sidebarCollapsed==='true'&&root.dataset.sidebarPeek!=='true'&&e.target.closest('#sidebar')&&!e.target.closest('a,button,input,select,textarea,summary,[role=button]')){e.preventDefault();e.stopImmediatePropagation();apply(false);return;}for(const id of ['workspace-menu','account-menu'])if(e.target.closest(`#${id} [data-action]`))document.getElementById(id)?.hidePopover();},true);
 document.addEventListener('toggle',e=>{if(!popovers.includes(e.target.id))return;const trigger=document.querySelector(`[popovertarget="${e.target.id}"]:not([popovertargetaction])`);trigger?.setAttribute('aria-expanded',String(e.newState==='open'));if(e.newState==='open')position(e.target);else if(!inside)peek(false);},true);
 document.addEventListener('keydown',e=>{
  const panel=e.target.closest?.('#workspace-menu,#account-menu,#getting-started-menu');
  if(panel&&e.key==='Escape'){e.preventDefault();e.stopPropagation();panel.hidePopover();document.querySelector(`[popovertarget="${panel.id}"]:not([popovertargetaction])`)?.focus();return;}
  if(panel&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){const items=[...panel.querySelectorAll('button:not(:disabled),a[href]')],i=items.indexOf(document.activeElement);e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}
 });
 function peek(show,focusLeaving=false){if(!pinnedCollapsed||!desktop()||root.dataset.sidebarPeek===String(show))return;if(!show&&(document.querySelector?.('#sidebar [popover]:popover-open')||(!focusLeaving&&root.dataset.inputModality==='keyboard'&&sidebar?.contains?.(document.activeElement))))return;motion.run(()=>{root.dataset.sidebarPeek=String(show);});}
 const sidebar=document.getElementById?.('sidebar');
 sidebar?.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;inside=true;root.dataset.inputModality='pointer';if(matchMedia('(hover:hover) and (pointer:fine)').matches)peek(true);});
 sidebar?.addEventListener('pointerleave',()=>{inside=false;peek(false);});
 // Reveal clipped controls immediately for keyboard navigation, without changing the saved layout.
 sidebar?.addEventListener('focusin',()=>{if(root.dataset.inputModality==='keyboard')peek(true);});
 sidebar?.addEventListener('focusout',e=>{if(!inside&&!sidebar.contains(e.relatedTarget))peek(false,true);});
 if(typeof window!=='undefined')window.addEventListener('resize',()=>{motion.cancel();document.querySelectorAll('#sidebar [popover]:popover-open').forEach(position);});
 return {sync};
}
