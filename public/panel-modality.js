export function createPanelModality(panel,dialog){
 const previous=new Map(),media=matchMedia('(max-width:650px)');
 let active=false;
 const floating=target=>target.closest?.('.thrive-select-popover,[data-base-ui-portal],[data-slot=popover-content],[role=listbox]');
 const stops=()=>[...panel.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length&&!el.closest('[inert]'));
 function sync(){
  active=!panel.hidden&&media.matches;
  panel.setAttribute('aria-modal',String(active));
  if(active){
   document.querySelectorAll('#sidebar,.workspace,[data-sites-widget]').forEach(el=>{if(!previous.has(el))previous.set(el,el.inert);el.inert=true;});
  }else{for(const [el,value]of previous)el.inert=value;previous.clear();}
 }
 document.addEventListener('focusin',e=>{if(active&&!dialog.open&&!panel.contains(e.target)&&!floating(e.target))panel.focus({preventScroll:true});});
 document.addEventListener('keydown',e=>{
  if(!active||dialog.open||e.key!=='Tab'||floating(e.target))return;
  const items=stops(),first=items[0],last=items.at(-1),focused=document.activeElement;
  if(!first){e.preventDefault();panel.focus();}
  else if(e.shiftKey&&(focused===first||focused===panel)){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&(focused===last||focused===panel)){e.preventDefault();first.focus();}
 },true);
 media.addEventListener('change',sync);
 return {sync};
}
