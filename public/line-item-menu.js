// Keep the menu in its row for draft capture and delegated actions, while the
// native popover layer lets it escape scrolling panels without shifting rows.
export function closeLineItemMenus(root){
 root.querySelectorAll('.line-item-options:popover-open').forEach(panel=>panel.hidePopover());
}
export function openLineItemMenu(button){
 if(!button)return;
 const panel=button.closest('.line-item-row').querySelector('.line-item-options');
 if(!panel.hasAttribute('popover')){
  panel.hidden=false;panel.setAttribute('popover','auto');
  // Light-dismiss runs before click; remember pointer-down state so a second
  // click on the trigger closes the menu rather than immediately reopening it.
  button.addEventListener('pointerdown',()=>button.dataset.menuWasOpen=String(panel.matches(':popover-open')));
  panel.setAttribute('aria-label','Line item options');
  panel.addEventListener('toggle',e=>button.setAttribute('aria-expanded',String(e.newState==='open')));
  panel.addEventListener('click',e=>{if(e.target.closest('.line-option-actions button:not(:disabled)'))panel.hidePopover();});
  panel.addEventListener('keydown',e=>{
   if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key)||!e.target.closest('.line-option-actions'))return;
   const items=[...panel.querySelectorAll('.line-option-actions button:not(:disabled)')];
   const index=items.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
   e.preventDefault();items[next]?.focus();
  });
 }
 if(panel.matches(':popover-open'))return;
 panel.showPopover();
 const anchor=button.getBoundingClientRect(),width=panel.offsetWidth,gap=6;
 panel.style.left=`${Math.max(12,Math.min(innerWidth-width-12,anchor.right-width))}px`;
 const below=Math.max(0,innerHeight-anchor.bottom-gap-12),above=Math.max(0,anchor.top-gap-12);
 const flip=panel.scrollHeight>below&&above>below,available=flip?above:below;
 panel.style.maxHeight=`${available}px`;
 panel.style.top=`${Math.max(12,flip?anchor.top-gap-Math.min(panel.scrollHeight,available):anchor.bottom+gap)}px`;
 button.setAttribute('aria-expanded','true');
 panel.querySelector('.line-option-actions button:not(:disabled)')?.focus({preventScroll:true});
}
export function toggleLineItemMenu(button){
 const panel=button.closest('.line-item-row').querySelector('.line-item-options');
 const wasOpen=button.dataset.menuWasOpen==='true';delete button.dataset.menuWasOpen;
 if(panel.matches(':popover-open')||wasOpen){if(panel.matches(':popover-open'))panel.hidePopover();button.focus({preventScroll:true});}
 else openLineItemMenu(button);
}
