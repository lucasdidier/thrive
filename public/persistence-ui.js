import {L} from './i18n.js';
// Keep completion feedback behind the persistence boundary, while dispatch stays synchronous.
export function createPersistenceUI({save,blocked=()=>false,toast=()=>{}}){
 const busy=new WeakSet(),pending=new WeakMap();
 const blockedMessage=L('Your changes have not synced. Use the recovery options before continuing.');
 return async function persist(source,mutate,complete,{form=false}={}){
  if(busy.has(source))return;
  const buttons=form?[...source.querySelectorAll('button[type=submit]')]:[source];
  const disabled=buttons.map(button=>button.disabled);
  const error=source.querySelector?.('.form-error')||source.closest?.('form,dialog')?.querySelector('.form-error');
  busy.add(source);source.setAttribute?.('aria-busy','true');buttons.forEach(button=>button.disabled=true);if(error)error.textContent='';
  try{
   if(blocked())throw Error(blockedMessage);
   // A click can toggle state. Once applied, retry its save instead of applying it twice.
   const result=!form&&pending.has(source)?pending.get(source):mutate();
   if(!form)pending.set(source,result);
   await save();
   if(blocked())throw Error(blockedMessage);
   pending.delete(source);
   if(source.isConnected!==false)complete(result);
   return true;
  }catch(err){if(error)error.textContent=err.message;else toast(err.message);return false;}
  finally{busy.delete(source);source.removeAttribute?.('aria-busy');buttons.forEach((button,i)=>{if(button.isConnected!==false)button.disabled=disabled[i];});}
 };
}
