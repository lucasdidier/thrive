import {L} from './i18n.js';
// Compare native source controls, not the generated controls in Fluid islands.
export function draftSnapshot(root) {
 return JSON.stringify([...root.querySelectorAll('input,textarea,select')]
  .filter(el=>!el.closest('.fluid-ui')&&!['search','submit','button'].includes(el.type)&&!el.matches('[data-draft-ignore]'))
  .map(el=>[el.name||el.id||'',el.type,['checkbox','radio'].includes(el.type)?[el.value,el.checked]:el.type==='file'?[...el.files].map(f=>[f.name,f.size,f.lastModified]):el.multiple?[...el.selectedOptions].map(option=>option.value):el.value]));
}

// `prompt` (async, in-app) is preferred over the synchronous `confirmDiscard`, which
// remains for tests and environments without the workspace prompt.
export function createDialogDraftGuard(dialog,{confirmDiscard=()=>window.confirm(L('Discard your unsaved changes? Your saved records will be kept.')),prompt=null}={}) {
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
 // Runs `next` immediately when nothing changed, otherwise after the person confirms discarding.
 function leave(next){if(!dirty()){next();return;}if(!prompt){if(confirmDiscard()){clear();next();}return;}Promise.resolve(prompt()).then(ok=>{if(ok){clear();next();}});}
 function canLeave(){if(!dirty())return true;if(prompt){leave(()=>dialog.close());return false;}if(!confirmDiscard())return false;clear();return true;}
 dialog.addEventListener('close',()=>{if(!dialog.open)clear();});
 dialog.addEventListener('cancel',event=>{if(!dirty())return;event.preventDefault();leave(()=>dialog.close());});
 window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
 return {track,dirty,canLeave,leave,clear};
}
