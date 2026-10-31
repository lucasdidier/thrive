import {navigateActionMenu} from './menu-keyboard.js';
let sequence=0;

// Secondary actions keep their original handlers and record attributes.
export function moreActions(content,icon,label='More actions'){
 if(!content)return '';
 const id=`more-actions-${++sequence}`;
 return `<span class="more-actions"><button type="button" class="btn icon-btn more-actions-trigger" data-action="more-actions" aria-label="${label}" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}">${icon('more')}</button><span id="${id}" class="record-actions-popover more-actions-menu" popover="auto" role="dialog" aria-label="${label}">${content}</span></span>`;
}

export function toggleMoreActions(button){
 const menu=button.parentElement.querySelector('.more-actions-menu');
 if(!menu.dataset.bound){
  menu.dataset.bound='true';
  button.addEventListener('pointerdown',()=>button.dataset.wasOpen=String(menu.matches(':popover-open')));
  menu.addEventListener('toggle',e=>button.setAttribute('aria-expanded',String(e.newState==='open')));
  menu.addEventListener('click',e=>{if(e.target.closest('[data-action]'))menu.hidePopover();});
  menu.addEventListener('keydown',e=>{
   navigateActionMenu(e,menu,{trigger:button,close:()=>menu.hidePopover()});
  });
 }
 const wasOpen=button.dataset.wasOpen==='true';delete button.dataset.wasOpen;
 if(menu.matches(':popover-open')||wasOpen){if(menu.matches(':popover-open'))menu.hidePopover();button.focus({preventScroll:true});return;}
 menu.showPopover();button.setAttribute('aria-expanded','true');
 const rect=button.getBoundingClientRect(),height=menu.offsetHeight;
 menu.style.left=`${Math.max(12,Math.min(innerWidth-menu.offsetWidth-12,rect.right-menu.offsetWidth))}px`;
 menu.style.top=`${Math.max(12,rect.bottom+6+height<=innerHeight-12?rect.bottom+6:rect.top-height-6)}px`;
 menu.querySelector('button:not(:disabled),a[href]')?.focus({preventScroll:true});
}
