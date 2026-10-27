// Preserve interaction context when a legacy editor replaces its markup.
const controlAttributes=['id','name','data-q','data-option','data-action','data-id','data-index','data-item','data-field','data-line-index','data-document-field'];
const ancestorAttributes=['id','data-id','data-index','data-line-index','data-question-id','data-group','data-offer-id'];
const attributes=(el,names)=>names.filter(a=>el.hasAttribute?.(a)).map(a=>[a,el.getAttribute(a)]);
function ancestors(el,container){const result=[];for(let parent=el.parentElement;parent&&parent!==container;parent=parent.parentElement){const keys=attributes(parent,ancestorAttributes);if(keys.length)result.push(keys);}return result;}
function identity(el,container,kind){return JSON.stringify({tag:el.tagName,attributes:attributes(el,controlAttributes),ancestors:ancestors(el,container),...(kind==='control'?{}:{className:el.className||'',...(kind==='details'?{label:el.querySelector?.('summary')?.textContent.trim()||''}:{})})});}
// Occurrence disambiguates repeated identical disclosures without copying the first
// disclosure's state onto every sibling. Record/row attributes take precedence.
function keyed(elements,container,kind){const counts=new Map();return elements.map(el=>{const key=identity(el,container,kind),occurrence=counts.get(key)||0;counts.set(key,occurrence+1);return {el,key:key+':'+occurrence};});}
export function editorContext(root, scope) {
 const container=root.querySelector(scope);
 if(!container)return ()=>{};
 const active=root.ownerDocument.activeElement;
 const focus=active&&container.contains(active)&&attributes(active,controlAttributes).length?identity(active,container,'control'):null;
 const selection=typeof active?.selectionStart==='number'?[active.selectionStart,active.selectionEnd]:null;
 const details=new Map(keyed([...container.querySelectorAll('details')],container,'details').map(({el,key})=>[key,el.open]));
 const positions=new Map(keyed([container,...container.querySelectorAll('*')],container,'scroll').filter(({el})=>el.scrollTop||el.scrollLeft).map(({el,key})=>[key,[el.scrollTop||0,el.scrollLeft||0]]));
 const scroll=[root.scrollTop,root.scrollLeft||0];
 return ()=>{
  const next=root.querySelector(scope);if(!next)return;
  for(const {el,key} of keyed([...next.querySelectorAll('details')],next,'details'))if(details.has(key))el.open=details.get(key);
  const target=focus?[...next.querySelectorAll('input,textarea,select,button,summary')].find(el=>identity(el,next,'control')===focus):null;
  if(target){target.focus({preventScroll:true});if(selection&&target.setSelectionRange)try{target.setSelectionRange(...selection);}catch{}}
  for(const {el,key} of keyed([next,...next.querySelectorAll('*')],next,'scroll')){const position=positions.get(key);if(position){el.scrollTop=position[0];el.scrollLeft=position[1];}}
  root.scrollTop=scroll[0];root.scrollLeft=scroll[1];
 };
}
