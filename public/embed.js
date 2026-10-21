/* Thrive Forms: one small loader, no dependencies and no visitor cookies. */
(()=>{
 'use strict';
 if(window.ThriveForms)return;
 const origin=new URL(document.currentScript.src).origin;
 let host,root,dialog,frame,closeButton,status,fallback,opener,previousOverflow,channel,currentKey='',ready=false,timeout;
 function options(value={}){return {theme:['light','dark','auto'].includes(value.theme)?value.theme:'light',accent:/^#[\da-f]{6}$/i.test(value.accent)?value.accent:'#42685b',title:String(value.title||'Contact form').slice(0,100)};}
 function formURL(value){const url=new URL(value,origin);if(url.origin!==origin||!/^\/share\/[a-f0-9]{64}$/.test(url.pathname)||url.username||url.password)throw Error('Use a Thrive form share link from '+origin);url.search='';url.hash='';return url;}
 function mount(){
  host=document.createElement('div');host.setAttribute('data-thrive-overlay','');root=host.attachShadow({mode:'open'});
  const css=document.createElement('link');css.rel='stylesheet';css.href=origin+'/form-overlay.css';root.append(css);
  dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Contact form');
  const bar=document.createElement('div');bar.className='bar';const brand=document.createElement('span');brand.textContent='Contact form';
  closeButton=document.createElement('button');closeButton.type='button';closeButton.className='close';closeButton.setAttribute('aria-label','Close form');closeButton.textContent='×';closeButton.addEventListener('click',close);bar.append(brand,closeButton);
  status=document.createElement('div');status.className='status';status.setAttribute('role','status');
  const note=document.createElement('span');note.textContent='Loading form…';fallback=document.createElement('a');fallback.textContent='Open form in a new tab ↗';fallback.target='_blank';fallback.rel='noopener noreferrer';status.append(note,fallback);
  frame=document.createElement('iframe');frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');frame.setAttribute('title','Contact form');
  dialog.append(bar,status,frame);root.append(dialog);document.body.append(host);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))close();});
  window.addEventListener('message',event=>{
   if(event.origin!==origin||event.source!==frame.contentWindow||event.data?.channel!==channel)return;
   if(event.data.type==='thrive:ready'){for(const [key,property]of [['background','backgroundColor'],['text','color']])if(/^#[a-f\d]{6}$/i.test(event.data.appearance?.[key]))dialog.style[property]=event.data.appearance[key];ready=true;clearTimeout(timeout);status.hidden=true;frame.removeAttribute('aria-busy');}
   if(event.data.type==='thrive:close')close();
   if(event.data.type==='thrive:submitted')document.dispatchEvent(new CustomEvent('thrive:submitted',{detail:{url:fallback.href}}));
  });
 }
 function open(value,settings={}){
  const url=formURL(value),config=options(settings);if(!host)mount();
  const key=JSON.stringify([url.href,config]);
  if(key!==currentKey){
   currentKey=key;ready=false;clearTimeout(timeout);channel=crypto.randomUUID();
   dialog.dataset.theme=config.theme;dialog.setAttribute('aria-label',config.title);frame.title=config.title;fallback.href=url.href;
   status.hidden=false;status.firstElementChild.textContent='Loading form…';frame.setAttribute('aria-busy','true');
   const embedded=new URL(url.pathname.replace('/share/','/embed/form/'),origin);for(const [k,v]of Object.entries({theme:config.theme,accent:config.accent,parent_origin:location.origin,channel}))embedded.searchParams.set(k,v);
   frame.src=embedded.href;
   timeout=setTimeout(()=>{if(!ready)status.firstElementChild.textContent='Unable to load here. You can open the form in a new tab.';},15000);
  }
  if(!dialog.open){opener=document.activeElement;previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';dialog.showModal();closeButton.focus();}
 }
 function close(){if(!dialog?.open)return;dialog.close();document.documentElement.style.overflow=previousOverflow;opener?.focus({preventScroll:true});}
 document.addEventListener('click',event=>{
  const trigger=event.target.closest?.('[data-thrive-form]');if(!trigger||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const value=trigger.getAttribute('data-thrive-form')||trigger.getAttribute('href');
  try{formURL(value);event.preventDefault();open(value,{theme:trigger.dataset.thriveTheme,accent:trigger.dataset.thriveAccent,title:trigger.dataset.thriveTitle||trigger.textContent?.trim()});}catch(error){console.warn('[Thrive Forms]',error.message);}
 });
 window.ThriveForms=Object.freeze({open,close});
})();
