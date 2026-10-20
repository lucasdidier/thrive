// Keep every step mounted so preview, custom controls, and FormData share one draft.
export function mountEditorWizard(form,{steps,initial=0,onStep=()=>{}}){
 const panels=[...form.querySelectorAll('[data-editor-step]')],footer=form.querySelector('.dialog-footer');
 let current=initial;
 form.noValidate=true;form.classList.add('editor-wizard');
 const nav=document.createElement('nav');nav.className='editor-steps';nav.setAttribute('aria-label','Editing steps');
 nav.innerHTML=steps.map((label,i)=>`<button type="button" data-editor-go="${i}" aria-controls="${form.id}-step-${i}"><span>${i+1}</span>${label}</button>`).join('');
 form.prepend(nav);
 panels.forEach((p,i)=>{p.id=`${form.id}-step-${i}`;p.setAttribute('aria-label',steps[i]);p.tabIndex=-1;});
 const back=document.createElement('button');back.type='button';back.className='btn';back.textContent='Back';
 const next=document.createElement('button');next.type='button';next.className='btn primary';next.textContent='Continue';
 const progress=document.createElement('span');progress.className='editor-progress';progress.setAttribute('aria-live','polite');
 const final=footer.querySelector('button[type=submit].primary');
 footer.prepend(progress);footer.insertBefore(back,final);footer.append(next);
 const error=form.querySelector('.form-error');
 function show(index,focus=true){
  current=Math.max(0,Math.min(steps.length-1,index));form.dataset.editorCurrent=current;form.dataset.editorLast=current===steps.length-1;
  panels.forEach((p,i)=>p.hidden=i!==current);
  nav.querySelectorAll('button').forEach((b,i)=>{if(i===current)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  back.hidden=current===0;next.hidden=current===steps.length-1;if(final)final.hidden=current!==steps.length-1;
  if(error)error.textContent='';
  progress.textContent=`Step ${current+1} of ${steps.length}`;onStep(current);
  if(focus){panels[current].focus({preventScroll:true});form.querySelector('.document-workbench,.invoice-workbench')?.scrollTo({top:0});}
 }
 function validate(all=false){
  const invalid=[...form.elements].find(el=>el.willValidate&&!el.validity.valid&&(all||panels[current].contains(el)));
  if(!invalid)return true;
  const i=panels.findIndex(p=>p.contains(invalid));if(i>=0)show(i);
  for(let parent=invalid.parentElement;parent&&parent!==form;parent=parent.parentElement){
   if(parent.tagName==='DETAILS')parent.open=true;
   if(parent.classList.contains('line-item-options')){parent.hidden=false;parent.parentElement.querySelector('.line-more')?.setAttribute('aria-expanded','true');}
  }
  invalid.reportValidity();
  const label=invalid.getAttribute('aria-label')||[...(invalid.labels?.[0]?.childNodes||[])].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).filter(Boolean).join(' ')||'This field';
  if(error)error.textContent=`${label}: ${invalid.validationMessage}`;
  invalid.focus();return false;
 }
 function advance(){if(validate())show(current+1);}
 back.addEventListener('click',()=>show(current-1));next.addEventListener('click',advance);
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-editor-go]');if(b)show(Number(b.dataset.editorGo));});
 form.addEventListener('submit',e=>{
  // Enter in an early step advances; only the explicit final action publishes.
  if(!e.submitter||(e.submitter===final&&current<steps.length-1)){e.preventDefault();e.stopPropagation();advance();return;}
  if(!e.submitter.formNoValidate&&!validate(true)){e.preventDefault();e.stopPropagation();return;}
  if(error)error.textContent='';
 });
 show(current,false);return {show,validate};
}
