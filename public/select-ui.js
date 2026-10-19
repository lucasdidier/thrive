// Keep native selects as the form/data contract; enhance their presentation once.
const controls=new Map();
let active=null,sequence=0,initialized=false,scheduled=false,invalidBatch=false;
const chevron='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
const check='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>';
const searchIcon='<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>';
const disabled=o=>o.disabled||o.parentElement?.tagName==='OPTGROUP'&&o.parentElement.disabled;
function labelFor(select){
 if(select.getAttribute('aria-label'))return select.getAttribute('aria-label');
 const ids=select.getAttribute('aria-labelledby');if(ids)return ids.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();
 return [...select.labels||[]].map(label=>{const clone=label.cloneNode(true);clone.querySelectorAll('select,.thrive-select,input,textarea,small,.hint').forEach(e=>e.remove());return clone.textContent.trim();}).filter(Boolean).join(' ')||'Choose an option';
}
function setAttribute(el,key,value){if(el.getAttribute(key)!==String(value))el.setAttribute(key,String(value));}
function sync(c){
 const {select,button,value}=c,option=select.selectedOptions[0];
 if(!select.isConnected||!c.wrap.isConnected){if(active?.control===c)close(false);controls.delete(select);return;}
 const text=option?.label||select.dataset.placeholder||'Choose an option';if(value.textContent!==text)value.textContent=text;
 button.disabled=select.matches(':disabled');setAttribute(button,'aria-required',select.required);setAttribute(button,'aria-label',c.label);
 button.classList.toggle('is-placeholder',!select.value&&(select.required||/^(choose|select)\b/i.test(text)));
 c.wrap.hidden=select.hidden;
 if(select.validity.valid){button.removeAttribute('aria-invalid');c.error?.remove();c.error=null;}
 if(active?.control===c&&(button.disabled||select.closest('dialog')&&!select.closest('dialog').open))close(false);
}
function enhance(select){
 if(select.closest("#record-project-form,#record-client-form,#workspace-settings,#settings-content,.fluid-ui")||controls.has(select)||select.multiple||select.size>1||select.dataset.nativeSelect!==undefined)return;
 const label=labelFor(select),wrap=document.createElement('span'),button=document.createElement('button'),value=document.createElement('span');
 wrap.className='thrive-select';button.type='button';button.className='thrive-select-trigger';value.className='thrive-select-value';
 button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
 button.id=`thrive-select-${++sequence}`;if(select.getAttribute('aria-describedby'))button.setAttribute('aria-describedby',select.getAttribute('aria-describedby'));
 const arrow=document.createElement('span');arrow.className='thrive-select-chevron';arrow.innerHTML=chevron;button.append(value,arrow);
 select.before(wrap);wrap.append(select,button);select.classList.add('thrive-native-select');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 const c={select,wrap,button,value,label};controls.set(select,c);sync(c);
 button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(active?.control===c)close();else open(c);});
 button.addEventListener('keydown',e=>key(e,c));
 select.addEventListener('focus',()=>{if(!button.disabled)button.focus();});
 select.addEventListener('invalid',e=>{e.preventDefault();setAttribute(button,'aria-invalid',true);if(!c.error){c.error=document.createElement('span');c.error.className='thrive-select-error';c.error.setAttribute('role','alert');wrap.append(c.error);}c.error.textContent=select.validationMessage;if(!invalidBatch){invalidBatch=true;setTimeout(()=>{const first=select.form?.querySelector('input:invalid,select:invalid,textarea:invalid');if(select.isConnected&&(!first||first===select))button.focus();invalidBatch=false;},0);}});
}
function refresh(){scheduled=false;document.querySelectorAll('select').forEach(enhance);for(const c of controls.values())sync(c);if(active&&!active.control.select.isConnected)close(false);}
function schedule(){if(!scheduled){scheduled=true;queueMicrotask(refresh);}}
function close(restore=true){
 if(!active)return;const a=active;active=null;a.panel.remove();a.control.button.setAttribute('aria-expanded','false');a.control.button.removeAttribute('aria-activedescendant');a.control.button.removeAttribute('aria-controls');
 if(restore&&a.control.button.isConnected&&!a.control.button.disabled)a.control.button.focus({preventScroll:true});
}
function position(){
 if(!active)return;const {panel,control}=active,r=control.button.getBoundingClientRect(),view=window.visualViewport,w=view?.width||innerWidth,h=view?.height||innerHeight;
 if(!r.width||!r.height){close(false);return;}
 const width=Math.min(Math.max(r.width,230),w-16),below=h-r.bottom-8,above=r.top-8,up=below<190&&above>below;
 panel.style.width=`${width}px`;panel.style.maxHeight=`${Math.max(100,Math.min(360,up?above-6:below-6))}px`;
 panel.style.left=`${Math.max(8,Math.min(r.left,w-width-8))}px`;panel.style.top='auto';panel.style.bottom='auto';
 if(up)panel.style.bottom=`${h-r.top+5}px`;else panel.style.top=`${r.bottom+5}px`;
}
function highlight(index,scroll=true){
 if(!active)return;active.index=index;active.rows.forEach((row,i)=>row.node.classList.toggle('is-active',i===index));
 const row=active.rows[index],focused=active.search||active.control.button;
 if(row){focused.setAttribute('aria-activedescendant',row.node.id);if(scroll)row.node.scrollIntoView({block:'nearest'});}else focused.removeAttribute('aria-activedescendant');
}
function choose(index){
 if(!active)return;const {control,rows}=active,row=rows[index];if(!row||disabled(row.option))return;
 const {select,button}=control,changed=select.selectedIndex!==row.option.index;select.selectedIndex=row.option.index;sync(control);close();
 if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));schedule();
  // Many editors replace their form on change. Keep keyboard focus in that field.
  queueMicrotask(()=>{if(button.isConnected)return;const replacement=[...controls.values()].find(c=>c.select.isConnected&&c.select.name===select.name&&c.label===control.label);replacement?.button.focus({preventScroll:true});});
 }
}
function rows(query=''){
 const a=active;if(!a)return;a.list.replaceChildren();a.rows=[];let group=null;
 for(const option of a.control.select.options){if(option.hidden||option.parentElement.hidden||!option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))continue;
  const parent=option.parentElement;if(parent.tagName==='OPTGROUP'&&parent!==group){const title=document.createElement('div');title.className='thrive-select-group';title.textContent=parent.label;a.list.append(title);group=parent;}
  const node=document.createElement('div');node.className='thrive-select-option';node.id=`${a.list.id}-${option.index}`;node.setAttribute('role','option');node.setAttribute('aria-selected',option.selected);node.setAttribute('aria-disabled',!!disabled(option));
  const text=document.createElement('span');text.textContent=option.label;const mark=document.createElement('span');mark.className='thrive-select-check';if(option.selected)mark.innerHTML=check;node.append(text,mark);a.list.append(node);
  if(!disabled(option)){const index=a.rows.length;a.rows.push({node,option});node.addEventListener('pointermove',()=>highlight(index,false));node.addEventListener('click',()=>choose(index));}
 }
 if(!a.list.children.length){const empty=document.createElement('div');empty.className='thrive-select-empty';empty.textContent='No options found';a.list.append(empty);}
 let index=a.rows.findIndex(r=>r.option.selected);if(index<0)index=a.rows.length?0:-1;highlight(index);position();
}
function open(control,initial=''){
 if(control.button.disabled)return;close(false);const panel=document.createElement('div'),list=document.createElement('div');panel.className='thrive-select-popover';panel.setAttribute('popover','manual');list.className='thrive-select-options';list.id=`${control.button.id}-list`;list.setAttribute('role','listbox');list.setAttribute('aria-label',control.label);
 active={control,panel,list,rows:[],index:-1,search:null,buffer:'',typedAt:0};
 if(control.select.options.length>=8){const box=document.createElement('div');box.className='thrive-select-search';const symbol=document.createElement('span');symbol.innerHTML=searchIcon;const input=document.createElement('input');input.type='text';input.placeholder='Search…';input.autocomplete='off';input.spellcheck=false;input.setAttribute('role','combobox');input.setAttribute('aria-label',`Search ${control.label.toLocaleLowerCase()}`);input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','true');input.setAttribute('aria-controls',list.id);input.value=initial;box.append(symbol,input);panel.append(box);active.search=input;input.addEventListener('input',e=>{e.stopPropagation();rows(input.value);});input.addEventListener('change',e=>e.stopPropagation());input.addEventListener('keydown',e=>key(e,control));}
 panel.append(list);(control.select.closest('dialog')||document.body).append(panel);panel.addEventListener('click',e=>e.stopPropagation());panel.addEventListener('pointerdown',e=>{if(e.target.closest('[role=option]'))e.preventDefault();});panel.showPopover();
 control.button.setAttribute('aria-expanded','true');control.button.setAttribute('aria-controls',list.id);rows(initial);(active.search||control.button).focus({preventScroll:true});position();
}
function key(e,c){
 if(e.metaKey||e.ctrlKey||e.altKey)return;const isOpen=active?.control===c;
 if(e.key==='Escape'&&isOpen){e.preventDefault();e.stopPropagation();close();return;}
 if(e.key==='Tab'&&isOpen){const searching=!!active.search;if(searching){c.button.focus({preventScroll:true});}close(false);return;}
 if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)&&!(e.target===active?.search&&e.key===' ')){
  e.preventDefault();e.stopPropagation();if(!isOpen){open(c);if(e.key==='Home')highlight(0);if(e.key==='End')highlight(active.rows.length-1);return;}
  if(e.key==='Enter'||e.key===' ')choose(active.index);else if(e.key==='Home')highlight(0);else if(e.key==='End')highlight(active.rows.length-1);else if(active.rows.length)highlight((active.index+(e.key==='ArrowDown'?1:-1)+active.rows.length)%active.rows.length);return;
 }
 if(e.target===active?.search)return;
 if(e.key.length===1){e.preventDefault();e.stopPropagation();if(!isOpen)open(c,c.select.options.length>=8?e.key:'');if(active.search)return;const now=Date.now();active.buffer=(now-active.typedAt<700?active.buffer:'')+e.key.toLocaleLowerCase();active.typedAt=now;const index=active.rows.findIndex(r=>r.option.label.toLocaleLowerCase().startsWith(active.buffer));if(index>=0)highlight(index);}
}
export function initSelects(){
 if(initialized)return;initialized=true;refresh();
 new MutationObserver(changes=>{if(changes.some(m=>!m.target.closest?.('.thrive-select-popover')&&(!m.target.closest?.('.thrive-select')||m.target.closest?.('select'))))schedule();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','required','selected','label','value','hidden']});
 document.addEventListener('change',schedule,true);document.addEventListener('reset',schedule,true);
 document.addEventListener('pointerdown',e=>{if(active&&!active.panel.contains(e.target)&&!active.control.wrap.contains(e.target))close(false);},true);
 document.addEventListener('close',()=>close(false),true);window.addEventListener('hashchange',()=>close(false));
 window.addEventListener('resize',position);window.visualViewport?.addEventListener('resize',position);
 document.addEventListener('scroll',e=>{if(active&&!active.panel.contains(e.target))position();},true);
}
