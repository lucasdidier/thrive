import {featureIcon} from './feature-icon.js';
import {icon} from './app-icons.js';
import {portalDefaults,portalCandidates,portalProjection,portalSections,savePortal} from './portal-domain.js';
import {portalView} from './portal-view.js';
import {linkAvailable} from './share-domain.js';
export function createPortalUI({getState:S,open,dialog,btn,esc,save,blocked,toast,share}){
 let clientId,tab='settings',inline=false;
 const surface=()=>inline?document.querySelector('#client-portal-tab'):dialog;
 const client=()=>S().clients.find(c=>c.id===clientId);
 function values(){const form=surface().querySelector('#portal-settings'),f=new FormData(form),data={enabled:f.has('enabled'),title:f.get('title'),intro:f.get('intro'),sections:{}};for(const key of Object.keys(portalSections)){data.sections[key]=f.has('section-'+key);data[key]=[...form.querySelectorAll(`input[name="${key}"]:checked`)].map(el=>el.value);}return data;}
 function preview(){const next=structuredClone(S());savePortal(next,clientId,values());return portalProjection(next,clientId,{preview:true});}
 function show(id){inline=false;clientId=id;tab='settings';draw();}
 function mountClient(id){inline=true;clientId=id;tab='settings';draw();}
 function draw(){const c=client();if(!c||c.archived){if(inline){surface().innerHTML='<p class="record-empty">Restore this client to configure its portal.</p>';return;}throw Error('Restore this client before configuring a portal.');}const p=c.portal||portalDefaults(c,S().settings),candidates=portalCandidates(S(),c.id),link=S().shareLinks?.find(l=>l.entity==='portal'&&l.recordId===c.id&&linkAvailable(S(),l));
 const sectionIcons={documents:'note',forms:'note',invoices:'invoices',projects:'projects',meetings:'calendar'};
 const picks=Object.entries(portalSections).map(([key,label])=>{
  const selected=item=>key==='documents'?p[key].some(r=>r.id===item.id&&r.version===item.version):key==='forms'?p[key].some(r=>r.id===item.id):p[key].includes(item.id);
  const count=candidates[key].filter(selected).length;
  return `<section class="portal-picker"><header>${featureIcon(sectionIcons[key],'md')}<span class="portal-picker-heading"><strong>${label}</strong><small data-portal-count>${count} selected · ${candidates[key].length} available</small></span><input type="checkbox" role="switch" aria-label="Show ${label} in client portal" aria-controls="portal-picks-${key}" name="section-${key}" ${p.sections[key]?'checked':''}></header><div class="portal-picker-list" id="portal-picks-${key}" data-portal-section="${key}" ${p.sections[key]?'':'hidden'}>${candidates[key].map(item=>`<label class="portal-pick-row"><input type="checkbox" name="${key}" ${p.sections[key]?'':'disabled'} value="${esc(item.id)}" ${selected(item)?'checked':''}><span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></span></label>`).join('')||`<p class="portal-picker-empty">No ${key==='documents'?'published documents':key==='invoices'?'issued invoices':label.toLowerCase()} available.</p>`}${candidates[key].length&&key==='documents'?'':candidates[key].length&&key==='forms'?'':''}</div></section>`;
 }).join('');
 const html=`<form id="portal-settings" data-id="${esc(c.id)}"><div class="dialog-body"><label class="portal-access">${featureIcon('clients','md')}<span><strong>Portal access</strong><small data-portal-access-status>${p.enabled?'Enabled · save to apply changes':'Off · configure content before sharing'}</small></span><input type="checkbox" role="switch" aria-label="Enable client portal" name="enabled" ${p.enabled?'checked':''}></label><div class="portal-editor-tabs"><button type="button" data-action="portal-tab" data-tab="settings" aria-pressed="true">${icon('settings')}Content</button><button type="button" data-action="portal-tab" data-tab="preview" aria-pressed="false">${icon('clients')}Client preview</button></div><div id="portal-content"><details class="portal-introduction"><summary><span><strong>Introduction</strong><small>${esc(p.title)}</small></span>${icon('down')}</summary><div><label class="field">Portal title<input name="title" value="${esc(p.title)}" required maxlength="100"></label><label class="field">Welcome message<textarea name="intro" rows="2" maxlength="1000">${esc(p.intro)}</textarea></label></div></details><div class="portal-content-heading"><h3>Shared content</h3><a href="#settings/portal">Workspace defaults ${icon('arrow')}</a></div><p class="portal-content-note">Only selected records are shared. Drafts and internal notes stay private.</p><div class="portal-pickers">${picks}</div><p class="portal-content-note portal-access-note">Turning off the portal blocks its link. Individual document links stay active.</p></div><div id="portal-preview" class="portal-preview-surface" hidden></div><div class="form-error" role="alert"></div></div><div class="dialog-footer">${inline?'':btn('Close','close')}<button class="btn" type="submit" value="save">Save changes</button><button class="btn primary" type="submit" value="share" ${p.enabled?'':'disabled'}>${link?'Save & manage link':'Save & create link'}</button></div></form>`;
 if(inline)surface().innerHTML=html;else{open('Client portal',html);dialog.classList.add('portal-editor');}

 }
 async function submit(form,action){const data=values();if(action==='share'&&!data.enabled)throw Error('Activate the portal before generating a client link.');savePortal(S(),clientId,data);await save();if(blocked())return;toast('Client portal saved.');if(action==='share')share('portal',clientId);else draw();}
 function handleSubmit(form,submitter){if(form.id!=='portal-settings')return false;void submit(form,submitter?.value||'save').catch(error=>{const box=surface().querySelector('.form-error');if(box)box.textContent=error.message;else toast(error.message);});return true;}
 function handleClick(action,el){if(action==='client-portal'){show(el.dataset.id);return true;}if(action==='portal'){const project=S().projects.find(p=>p.id===el.dataset.id);if(!project)throw Error('Project not found.');show(project.clientId);return true;}if(action!=='portal-tab')return false;tab=el.dataset.tab;try{if(tab==='preview')surface().querySelector('#portal-preview').innerHTML='<div class="portal-preview-label">Preview · responses are disabled</div>'+portalView(preview(),{preview:true});surface().querySelector('#portal-content').hidden=tab==='preview';surface().querySelector('#portal-preview').hidden=tab!=='preview';surface().querySelectorAll('[data-action="portal-tab"]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===tab));surface().querySelector('.form-error').textContent='';}catch(error){surface().querySelector('.form-error').textContent=error.message;}return true;}
 document.addEventListener('change',event=>{
  const el=event.target;if(!el.matches('#portal-settings input'))return;
  const form=el.closest('form');
  if(el.name==='enabled'){
   form.querySelector('[data-portal-access-status]').textContent=el.checked?'Enabled · save to apply changes':'Off · configure content before sharing';
   form.querySelector('button[value="share"]').disabled=!el.checked;
  }else if(el.name==='title'){
   form.querySelector('.portal-introduction summary small').textContent=el.value||'Add a portal title';
  }else if(el.name.startsWith('section-')){
   const list=el.closest('.portal-picker').querySelector('.portal-picker-list');list.hidden=!el.checked;
   list.querySelectorAll('input').forEach(input=>input.disabled=!el.checked);
  }else if(Object.hasOwn(portalSections,el.name)){
   const picker=el.closest('.portal-picker'),inputs=[...picker.querySelectorAll('.portal-pick-row input')];
   picker.querySelector('[data-portal-count]').textContent=`${inputs.filter(input=>input.checked).length} selected · ${inputs.length} available`;
  }
 });
 document.addEventListener('invalid',event=>{
  const el=event.target;if(!el.matches('#portal-settings [name=title]'))return;
  const form=el.closest('form');form.querySelector('.portal-introduction').open=true;
  form.querySelector('#portal-content').hidden=false;form.querySelector('#portal-preview').hidden=true;tab='settings';
  form.querySelectorAll('[data-action=portal-tab]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.tab==='settings'));
 },true);
 return {handleClick,handleSubmit,show,mountClient};
}
