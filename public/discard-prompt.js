export function createDiscardPrompt(){
 let pending;
 return function confirmDiscard(){
  if(pending)return pending;
  pending=new Promise(resolve=>{
   const opener=document.activeElement,modal=document.createElement('dialog');
   modal.className='discard-prompt';modal.setAttribute('aria-labelledby','discard-settings-title');
   modal.innerHTML='<div class="dialog-head"><h2 id="discard-settings-title">Discard settings changes?</h2></div><div class="dialog-body"><p>Your unsaved changes will be lost. Saved settings will stay as they are.</p></div><div class="dialog-footer"><button type="button" class="btn primary" data-keep autofocus>Keep editing</button><button type="button" class="btn" data-discard>Discard changes</button></div>';
   let done=false;
   const finish=discard=>{if(done)return;done=true;modal.close();modal.remove();pending=null;opener?.isConnected&&opener.focus();resolve(discard);};
   modal.addEventListener('cancel',e=>{e.preventDefault();finish(false);});
   modal.querySelector('[data-keep]').addEventListener('click',()=>finish(false));
   modal.querySelector('[data-discard]').addEventListener('click',()=>finish(true));
   document.body.append(modal);modal.showModal();
  });
  return pending;
 };
}
