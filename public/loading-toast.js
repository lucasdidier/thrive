// Returns a task-specific dismiss function so concurrent requests cannot hide each other.
export function loadingToast(message){
 let region=document.querySelector('#loading-toasts');
 if(!region){region=document.createElement('div');region.id='loading-toasts';region.className='loading-toasts';document.body.append(region);}
 const item=document.createElement('div');item.className='loading-toast';item.setAttribute('role','status');
 const spinner=document.createElement('span');spinner.className='loading-toast-spinner';spinner.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.textContent=message;item.append(spinner,label);region.append(item);
 return ()=>{item.remove();if(!region.childElementCount)region.remove();};
}
