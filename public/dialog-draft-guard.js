// Compare native source controls, not the generated controls in Fluid islands.
export function draftSnapshot(root) {
 return JSON.stringify([...root.querySelectorAll('input,textarea,select')]
  .filter(el=>!el.closest('.fluid-ui')&&!['search','submit','button'].includes(el.type)&&!el.matches('[data-draft-ignore]'))
  .map(el=>[el.name||el.id||'',el.type,['checkbox','radio'].includes(el.type)?[el.value,el.checked]:el.type==='file'?[...el.files].map(f=>[f.name,f.size,f.lastModified]):el.multiple?[...el.selectedOptions].map(option=>option.value):el.value]));
}

export function createDialogDraftGuard(dialog,{confirmDiscard=()=>window.confirm('Discard your unsaved changes? Your saved records will be kept.')}={}) {
 let key='',baseline='',generation=0;
 function clear(){key='';baseline='';generation++;}
 function track(){
  const token=++generation;
  queueMicrotask(()=>{
   if(token!==generation||!dialog.open)return;
   const form=dialog.querySelector('form');
   const next=form?`${form.id}:${form.dataset.id||''}`:'';
   if(!next){key='';baseline='';return;}
   if(next!==key){key=next;baseline=draftSnapshot(dialog);}
  });
 }
 const dirty=()=>!!(dialog.open&&key&&draftSnapshot(dialog)!==baseline);
 function canLeave(){if(!dirty())return true;if(!confirmDiscard())return false;clear();return true;}
 dialog.addEventListener('close',()=>{if(!dialog.open)clear();});
 dialog.addEventListener('cancel',event=>{if(!canLeave())event.preventDefault();});
 window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
 return {track,dirty,canLeave,clear};
}
