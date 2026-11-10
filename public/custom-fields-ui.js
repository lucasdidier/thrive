import {cancelInlineEdit} from './inline-edit.js';
import {L} from './i18n.js';
import {createPersistenceUI} from './persistence-ui.js';
import {fieldsFor,fieldById,fieldTypes,saveField,archiveField,setFieldValue,fieldDisplay} from './custom-fields-domain.js';
export function createCustomFieldsUI(ctx){
 const {getState:S,open,dialog,esc,icon,btn,save,render,toast}=ctx;let origin=null,optionRows=[];
 const persist=createPersistenceUI(ctx);
 const scopeLabel=e=>e==='client'?L('Clients'):L('Projects');
 function properties(entity,r){const fields=fieldsFor(S(),entity);return fields.map(f=>`<div class="record-property"><span title="${esc(f.description)}">${icon(fieldTypes[f.type][1])}${esc(f.name)}</span><div class="record-value">${cell(entity,r,f)}</div></div>`).join('')+`<button class="text-btn record-manage-fields" data-action="cf-manage" data-entity="${entity}" data-record="${r.id}">${icon('settings')}${L('Manage fields')}</button>`;}
 function cell(entity,r,f){const value=fieldDisplay(f,r.customFields?.[f.id]);return `<button class="editable-cell custom-cell" data-action="cf-value" data-entity="${entity}" data-id="${f.id}" data-record="${r.id}" aria-label="${esc(L('Edit {field} for {record}',{field:f.name,record:r.name}))}"><span class="${value?'':'muted'}">${value?esc(value):'—'}</span>${icon('edit')}</button>`;}
 function remember(el){origin=el.dataset.record?{entity:el.dataset.entity,id:el.dataset.record}:null;}
 function back(){dialog.close();render();if(origin)ctx.recordDetail(origin.entity,origin.id);else ctx.refresh();}
 function manage(entity){const all=fieldsFor(S(),entity,true);open(L('{scope} · Custom fields',{scope:scopeLabel(entity)}),`<div class="dialog-body"><div class="cf-list">${all.map(f=>`<div class="cf-definition"><span>${icon(fieldTypes[f.type][1])}</span><button class="text-btn" data-action="cf-edit" data-entity="${entity}" data-id="${f.id}"><strong>${esc(f.name)}</strong><small>${fieldTypes[f.type][0]}${f.archived?' · '+L('Archived'):''}</small></button><button class="btn subtle" data-action="cf-archive" data-entity="${entity}" data-id="${f.id}" data-archived="${!f.archived}">${f.archived?L('Restore'):L('Archive')}</button></div>`).join('')||`<div class="cf-empty"><span class="cf-empty-icon feature-icon feature-icon--lg">${icon('settings')}</span><h3>${L('Make room for your details')}</h3>${btn(icon('plus')+L('Add your first field'),'cf-add',`data-entity="${entity}"`,'primary')}</div>`}</div>${all.length?'':''}</div>`,{footer:btn(L('Done'),'cf-back')+(all.length?btn(icon('plus')+L('Add field'),'cf-add',`data-entity="${entity}"`,'primary'):'')});}
 function edit(entity,id){const f=id?fieldById(S(),entity,id):{name:'',type:'text',description:'',options:[]};optionRows=structuredClone(f.options);open(id?L('Edit field'):L('Add field'),`<form id="cf-definition-form" data-entity="${entity}" data-id="${id||''}"><div class="dialog-body"><div class="field-row"><label class="field">${L('Name')}<input name="name" value="${esc(f.name)}" placeholder="${esc(L('e.g. Lead source'))}" maxlength="60" required autofocus></label><label class="field">${L('Type')}<select name="type" id="cf-type" ${id?'disabled':''}>${Object.entries(fieldTypes).map(([type,[label]])=>`<option value="${type}" ${f.type===type?'selected':''}>${label}</option>`).join('')}</select></label></div><label class="field">${L('Description')}<input name="description" maxlength="300" value="${esc(f.description)}" placeholder="${esc(L('Help people use this field'))}"></label><div id="cf-options" ${['select','multiselect'].includes(f.type)?'':'hidden'}><label class="field">${L('Options')}</label><div id="cf-option-rows"></div>${btn(icon('plus')+L('Add option'),'cf-option-add','','subtle')}</div><div class="cf-preview"><small>${L('Preview').toUpperCase()} · ${scopeLabel(entity).toUpperCase()}</small><div><span id="cf-preview-label">${esc(f.name||L('Field name'))}</span><span id="cf-preview-value" class="muted">${fieldTypes[f.type][0]}</span></div></div><div class="form-error" role="alert"></div></div><div class="dialog-footer">${btn(L('Cancel'),'cf-manage',`data-entity="${entity}"`)}<button class="btn primary" type="submit">${id?L('Save field'):L('Create field')}</button></div></form>`);drawOptions();}
 function drawOptions(){const host=document.querySelector('#cf-option-rows');if(!host)return;host.innerHTML=optionRows.map((o,i)=>`<div class="cf-option-row"><span class="cf-option-dot" style="--option-hue:${i*47+150}"></span><input aria-label="${esc(L('Option {n}',{n:i+1}))}" data-cf-option="${i}" value="${esc(o.label)}" maxlength="60" placeholder="${esc(L('Option name'))}"><button class="icon-btn" type="button" data-action="cf-option-remove" data-index="${i}" aria-label="${esc(L('Remove option {n}',{n:i+1}))}">${icon('close')}</button></div>`).join('');}
 function valueEditor(entity,recordId,fieldId,el){const f=fieldById(S(),entity,fieldId),r=S()[entity==='client'?'clients':'projects'].find(r=>r.id===recordId),v=r.customFields?.[fieldId];let input;
 if(f.type==='multiselect')input=`<div class="cf-choices">${f.options.map(o=>`<label><input type="checkbox" name="value" value="${o.id}" ${v?.includes(o.id)?'checked':''}>${esc(o.label)}</label>`).join('')}</div>`;
 else if(['select','checkbox'].includes(f.type)){const options=f.type==='checkbox'?[{id:'true',label:L('Checked')},{id:'false',label:L('Unchecked')}]:f.options;input=`<select name="value" aria-label="${esc(f.name)}"><option value="">${L('No value')}</option>${options.map(o=>`<option value="${o.id}" ${String(v)===o.id?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`;}
 else input=`<input name="value" aria-label="${esc(f.name)}" type="${({currency:'number',number:'number',date:'date',email:'email',url:'url'})[f.type]||'text'}" ${['currency','number'].includes(f.type)?'step="any"':''} value="${esc(v??'')}" maxlength="5000" autofocus>`;
 cancelInlineEdit();
 const host=el.parentElement;host.dataset.inlineOriginal=host.innerHTML;host.innerHTML=`<form id="cf-value-form" class="inline-editor cf-inline-editor" data-entity="${entity}" data-record="${recordId}" data-id="${fieldId}">${input}<div class="inline-actions"><button type="submit" class="icon-btn" aria-label="${esc(L('Save {field}',{field:f.name}))}">${icon('check')}</button>${btn(L('Clear'),'cf-clear',`data-entity="${entity}" data-record="${recordId}" data-id="${fieldId}"`,'text-btn')}${btn(L('Cancel'),'cf-inline-cancel','','text-btn')}</div><div class="form-error" role="alert"></div></form>`;host.querySelector('input,select')?.focus();

 }
 function handleClick(a,el){if(!a.startsWith('cf-'))return false;const e=el.dataset.entity,id=el.dataset.id;
 if(a==='cf-manage'){if(el.dataset.record)remember(el);else if(el.closest('.crm-page,#settings-content'))origin=null;manage(e);}
 else if(a==='cf-add'||a==='cf-edit'){if(el.closest('.crm-page,#settings-content'))origin=null;edit(e,id);}
 else if(a==='cf-back')back();
 else if(a==='cf-archive'){void persist(el,()=>archiveField(S(),e,id,el.dataset.archived==='true'),()=>{render();manage(e);toast(el.dataset.archived==='true'?L('Field archived. Values preserved.'):L('Field restored.'));});}
 else if(a==='cf-value'){origin=null;valueEditor(e,el.dataset.record,id,el);}
 else if(a==='cf-inline-cancel'){render();ctx.refresh();}
 else if(a==='cf-clear'){void persist(el,()=>setFieldValue(S(),e,el.dataset.record,id,null),()=>{render();ctx.refresh();toast(L('Value cleared.'));});}
 else if(a==='cf-option-add'){optionRows.push({label:''});drawOptions();document.querySelector('#cf-option-rows')?.lastElementChild?.querySelector('input').focus();}
 else if(a==='cf-option-remove'){optionRows.splice(Number(el.dataset.index),1);drawOptions();}
 return true;}
 function handleInput(el){if(el.dataset.cfOption!==undefined){optionRows[Number(el.dataset.cfOption)].label=el.value;return true;}if(el.closest('#cf-definition-form')&&el.name==='name'){document.querySelector('#cf-preview-label').textContent=el.value||L('Field name');return true;}return false;}
 function handleChange(el){if(el.id!=='cf-type')return false;document.querySelector('#cf-options').hidden=!['select','multiselect'].includes(el.value);document.querySelector('#cf-preview-value').textContent=fieldTypes[el.value][0];if(!optionRows.length&&['select','multiselect'].includes(el.value)){optionRows=[{label:''}];drawOptions();}return true;}
 function handleSubmit(form,v){
  if(!['cf-definition-form','cf-value-form'].includes(form.id))return false;
  if(form.getAttribute('aria-busy')==='true')return true;
  const e=form.dataset.entity,existing=!!form.dataset.id;
  form.inlineSave=persist(form,()=>{
   const id=form.dataset.id;
   if(form.id==='cf-definition-form'){
    const f=saveField(S(),e,{...v,type:id?fieldById(S(),e,id).type:v.type,options:optionRows},id||undefined);
    form.dataset.id=f.id;optionRows=structuredClone(f.options);return f;
   }
   const f=fieldById(S(),e,id);let value=v.value;
   if(f.type==='multiselect')value=new FormData(form).getAll('value');else if(value==='')value=null;else if(['number','currency'].includes(f.type))value=Number(value);else if(f.type==='checkbox')value=value==='true';
   setFieldValue(S(),e,form.dataset.record,id,value);
  },field=>{
   if(form.id==='cf-definition-form'){ctx.showColumn(e,field.id);render();manage(e);toast(existing?L('Field updated.'):L('Field created.'));}
   else{render();ctx.refresh();toast(L('Field updated.'));}
  },{form:true});return true;
 }
 return {properties,cell,handleClick,handleInput,handleChange,handleSubmit};
}
