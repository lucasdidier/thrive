// Returns a task-specific dismiss function so concurrent requests cannot hide each other.
export function loadingToast(message){
 let region=document.querySelector('#loading-toasts');
 if(!region){region=document.createElement('div');region.id='loading-toasts';region.className='loading-toasts';document.body.append(region);}
 const item=document.createElement('div');item.className='loading-toast';item.setAttribute('role','status');
 const spinner=document.createElement('span');spinner.className='loading-toast-spinner';spinner.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.textContent=message;item.append(spinner,label);region.append(item);
 let closing=false,timer;
 const remove=()=>{clearTimeout(timer);item.remove();if(!region.childElementCount)region.remove();};
 return ()=>{
  if(closing)return;closing=true;
  item.setAttribute('data-closing','');
  item.setAttribute('aria-hidden','true');
  item.addEventListener('transitionend',event=>{if(event.target===item&&event.propertyName==='opacity')remove();},{once:true});
  // Also finish in background tabs or when no transition was started.
  timer=setTimeout(remove,180);
 };
}
