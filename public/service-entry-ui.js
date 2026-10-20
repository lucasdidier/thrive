import {matchingServices,serviceRate} from './service-entry-domain.js';
import {money} from './domain.js';
import {currencyCode} from './currency.js';
import {rateSuffix} from './pricing.js';
let sequence=0;

export function serviceNameField(value,attributes,esc){
 return `<input data-service-name role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" placeholder="Type or search services…" value="${esc(value)}" ${attributes}>`;
}
export function lineTableHeading(){return '<div class="line-table-heading" aria-hidden="true"><span>Service / item</span><span>Rate</span><span>Qty</span><span>Total</span><span></span></div>';}

export function attachServiceEntry(form,{getState,esc,onSelect,onCreate}){
 let input=null,options=[],active=-1;
 const popup=document.createElement('div');popup.className='service-suggestions';popup.id=`service-suggestions-${++sequence}`;popup.setAttribute('popover','manual');popup.setAttribute('role','listbox');popup.setAttribute('aria-label','Services and packages');form.append(popup);
 function close(){if(popup.matches(':popover-open'))popup.hidePopover();if(input){input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}active=-1;}
 function position(){if(!input||!popup.matches(':popover-open'))return;const r=input.getBoundingClientRect(),width=Math.min(Math.max(r.width,300),innerWidth-24);popup.style.width=width+'px';popup.style.left=Math.max(12,Math.min(r.left,innerWidth-width-12))+'px';popup.style.top=Math.max(12,r.bottom+6+popup.offsetHeight>innerHeight-12?r.top-popup.offsetHeight-6:r.bottom+6)+'px';}
 function paint(){const {matches,canCreate}=matchingServices(getState(),input.value);options=matches.map(service=>({service}));if(canCreate)options.push({name:input.value.trim()});active=-1;
  popup.innerHTML=options.map((o,i)=>`<div role="option" id="${popup.id}-${i}" data-service-option="${i}" aria-selected="false">${o.service?`<span><strong>${esc(o.service.name)}</strong><small>${o.service.kind==='package'?`${o.service.items.length} items · Package`:'Saved service'}</small></span><span class="service-option-rate">${esc(money(serviceRate(o.service),currencyCode(getState())))}<small>${esc(rateSuffix(o.service))}</small></span>`:`<span class="service-create-option"><span aria-hidden="true">＋</span><span><strong>Create “${esc(o.name)}”</strong><small>Save a reusable service with this draft</small></span></span>`}</div>`).join('')||'<p>Type a name to create a service.</p>';
  input.setAttribute('aria-controls',popup.id);input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');if(!popup.matches(':popover-open'))popup.showPopover();position();
 }
 function choose(index){const option=options[index],target=input;if(!option)return;close();try{if(option.service)onSelect(target,option.service);else onCreate(target,option.name);}catch(error){const box=form.querySelector('.form-error');if(box)box.textContent=error.message;}}
 form.addEventListener('focusin',e=>{if(e.target.matches('[data-service-name]')&&!e.target.readOnly){input=e.target;paint();}else if(!popup.contains(e.target))close();});
 form.addEventListener('input',e=>{if(e.target.matches('[data-service-name]')&&!e.target.readOnly){input=e.target;paint();}});
 form.addEventListener('keydown',e=>{
  if(e.target!==input||e.isComposing)return;
  if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopPropagation();if(!popup.matches(':popover-open'))paint();if(!options.length)return;active=(active+(e.key==='ArrowDown'?1:active<0?0:-1)+options.length)%options.length;popup.querySelectorAll('[role=option]').forEach((el,i)=>el.setAttribute('aria-selected',i===active));input.setAttribute('aria-activedescendant',`${popup.id}-${active}`);const option=popup.children[active];if(option.offsetTop<popup.scrollTop)popup.scrollTop=option.offsetTop;else if(option.offsetTop+option.offsetHeight>popup.scrollTop+popup.clientHeight)popup.scrollTop=option.offsetTop+option.offsetHeight-popup.clientHeight;}
  else if(e.key==='Enter'&&popup.matches(':popover-open')){e.preventDefault();e.stopPropagation();choose(active>=0?active:0);}
  else if(e.key==='Escape'&&popup.matches(':popover-open')){e.preventDefault();e.stopPropagation();close();}
  else if(e.key==='Tab')close();
 });
 popup.addEventListener('pointerdown',e=>e.preventDefault());
 popup.addEventListener('click',e=>{const option=e.target.closest('[data-service-option]');if(option)choose(Number(option.dataset.serviceOption));});
 form.addEventListener('click',e=>{if(e.target!==input&&!popup.contains(e.target))close();});
 form.addEventListener('focusout',e=>{if(e.target===input&&!popup.contains(e.relatedTarget))close();});
 form.addEventListener('scroll',position,true);
 form.addEventListener('submit',close);
 return {close};
}
