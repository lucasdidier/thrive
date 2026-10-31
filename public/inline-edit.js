// Inline fields are explicit-save controls. Leaving restores the saved display
// in place, so the original click can reach its destination without a replay.
const selector='#rp-inline-form,#cf-value-form,#crm-inline-form';
const installed=new WeakSet();
const inPopup=target=>target?.closest?.('.thrive-select-popover,.fluid-portals');
export function cancelInlineEdit(doc=document,{focus=false}={}){
 const form=doc.querySelector(selector),host=form?.parentElement;
 if(!host||host.dataset.inlineOriginal===undefined)return false;
 const original=host.dataset.inlineOriginal;
 delete host.dataset.inlineOriginal;
 host.innerHTML=original;
 if(focus)host.querySelector('button,input,select,[tabindex]')?.focus({preventScroll:true});
 return true;
}
export function installInlineEditing(doc=document){
 if(installed.has(doc))return;installed.add(doc);
 doc.addEventListener('click',event=>{
  const form=doc.querySelector(selector);
  if(!form||form.contains(event.target)||inPopup(event.target))return;
  cancelInlineEdit(doc);
 },true);
 doc.addEventListener('focusout',event=>{
  const form=event.target.closest?.(selector);
  if(!form||!event.relatedTarget)return;
  // Pointer actions cancel synchronously above; Tab leaves through this path.
  setTimeout(()=>{
   if(!form.isConnected||form.contains(doc.activeElement)||inPopup(doc.activeElement))return;
   cancelInlineEdit(doc);
  },0);
 });
 doc.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!event.target.closest?.(selector)||inPopup(event.target))return;
  event.preventDefault();event.stopImmediatePropagation();
  cancelInlineEdit(doc,{focus:true});
 },true);
}
