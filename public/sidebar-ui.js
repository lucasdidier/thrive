export function initSidebarUI(storageKey){
 const root=document.documentElement,key=storageKey+':sidebar-collapsed';
 try{root.dataset.sidebarCollapsed=localStorage.getItem(key)==='true'?'true':'false';}catch{root.dataset.sidebarCollapsed='false';}
 const desktop=()=>matchMedia('(min-width:651px)').matches;
 function apply(collapsed){root.dataset.sidebarCollapsed=String(collapsed);try{localStorage.setItem(key,String(collapsed));}catch{}sync();}
 function sync(){const button=document.querySelector('[data-sidebar-toggle]'),collapsed=root.dataset.sidebarCollapsed==='true';if(button){button.setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');button.setAttribute('title',collapsed?'Expand sidebar':'Collapse sidebar');button.setAttribute('aria-expanded',String(!collapsed));}}
 document.addEventListener('click',e=>{const toggle=e.target.closest('[data-sidebar-toggle]');if(toggle){e.preventDefault();e.stopImmediatePropagation();apply(root.dataset.sidebarCollapsed!=='true');return;}if(desktop()&&root.dataset.sidebarCollapsed==='true'&&e.target.closest('#sidebar')){e.preventDefault();e.stopImmediatePropagation();apply(false);return;}if(e.target.closest('#workspace-menu [data-action]'))document.querySelector('#workspace-menu')?.hidePopover();},true);
 document.addEventListener('toggle',e=>{if(e.target.id==='workspace-menu')document.querySelector('[popovertarget="workspace-menu"]')?.setAttribute('aria-expanded',String(e.newState==='open'));},true);
 return {sync};
}
