// Shared keyboard behavior for action lists. Text fields keep their native keys.
const searches=new WeakMap();
export function navigateActionMenu(event,panel,{trigger,close}={}){
 if(event.defaultPrevented||event.isComposing||event.metaKey||event.ctrlKey||event.altKey)return false;
 if(event.key==='Escape'){
  event.preventDefault();event.stopPropagation();close?.();trigger?.focus({preventScroll:true});return true;
 }
 if(event.target.closest?.('input,textarea,select,[contenteditable=true]'))return false;
 const items=[...panel.querySelectorAll('button,a[href]')].filter(el=>!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&!el.closest('[hidden],[inert]')&&el.getClientRects().length);
 if(!items.length)return false;
 const index=items.indexOf(event.target.closest?.('button,a[href]'));
 let next=-1;
 if(event.key==='Home')next=0;
 else if(event.key==='End')next=items.length-1;
 else if(event.key==='ArrowDown')next=(index+1)%items.length;
 else if(event.key==='ArrowUp')next=index<0?items.length-1:(index-1+items.length)%items.length;
 else if(event.key.length===1&&event.key.trim()){
  const now=Date.now(),previous=searches.get(panel),letter=event.key.toLocaleLowerCase();
  const buffer=(previous&&now-previous.at<700?previous.buffer:'')+letter;
  searches.set(panel,{buffer,at:now});
  const query=[...buffer].every(c=>c===letter)?letter:buffer;
  for(let step=1;step<=items.length;step++){
   const candidate=(index+step)%items.length;
   if((items[candidate].getAttribute('aria-label')||items[candidate].textContent).trim().toLocaleLowerCase().startsWith(query)){next=candidate;break;}
  }
 }else return false;
 event.preventDefault();event.stopPropagation();items[next]?.focus({preventScroll:true});return true;
}
