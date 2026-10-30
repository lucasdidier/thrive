// Commit a property before dispatching an outside action. Re-find the control
// after rendering so a click on another field or navigation is not swallowed.
export function installInlineAutosave(doc=document){
 const selector='#rp-inline-form,#cf-value-form';
 let replaying=false;
 const pending=new WeakMap();
 function destination(target){
  const el=target?.closest?.('button,a,summary,input,select,textarea');
  if(!el)return ()=>null;
  const attrs=[...el.attributes].filter(a=>a.name==='id'||a.name==='href'||a.name==='aria-label'||a.name==='name'||a.name.startsWith('data-')).filter(a=>a.name!=='data-state');
  const label=el.textContent;
  return ()=>el.isConnected?el:[...doc.querySelectorAll(el.tagName)].find(candidate=>attrs.every(a=>candidate.getAttribute(a.name)===a.value)&&(attrs.length||candidate.textContent===label));
 }
 function commit(form){
  if(pending.has(form))return pending.get(form);
  if(!form.reportValidity())return Promise.resolve(false);
  form.requestSubmit();
  const task=Promise.resolve(form.inlineSave).then(ok=>ok===true);
  pending.set(form,task);task.finally(()=>pending.delete(form));return task;
 }
 doc.addEventListener('click',event=>{
  if(replaying)return;
  const form=doc.querySelector(selector);
  if(!form||form.contains(event.target)||event.target.closest?.('.thrive-select-popover,.fluid-portals'))return;
  const find=destination(event.target);
  event.preventDefault();event.stopImmediatePropagation();
  if(pending.has(form))return;
  void commit(form).then(ok=>{if(!ok)return;const next=find();if(next){replaying=true;try{next.focus({preventScroll:true});next.click();}finally{replaying=false;}}});
 },true);
 doc.addEventListener('focusout',event=>{
  const form=event.target.closest?.(selector);
  if(!form||!event.relatedTarget)return;
  // Let pointer click dispatch first; keyboard focus leaves through this path.
  setTimeout(()=>{
   if(!form.isConnected||form.contains(doc.activeElement)||doc.activeElement.closest?.('.thrive-select-popover,.fluid-portals'))return;
   const find=destination(doc.activeElement);
   void commit(form).then(ok=>{if(ok)find()?.focus({preventScroll:true});});
  },0);
 });
 doc.addEventListener('keydown',event=>{
  const form=event.target.closest?.(selector);
  if(event.key!=='Escape'||!form||form.getAttribute('aria-busy')==='true')return;
  event.preventDefault();event.stopImmediatePropagation();
  form.querySelector('[data-action="rp-cancel"],[data-action="cf-inline-cancel"]')?.click();
 },true);
}
