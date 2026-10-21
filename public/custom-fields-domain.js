import {currencyCode} from './currency.js';
import {uid} from './domain.js';
export const fieldTypes={text:['Text','note'],number:['Number','money'],currency:['Currency','money'],date:['Date','calendar'],checkbox:['Checkbox','check'],select:['Select','tag'],multiselect:['Multi-select','tag'],email:['Email','mail'],url:['Link','external']};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function fieldsFor(s,entity,archived=false){if(!['client','project'].includes(entity))return [];return (s.customFields?.[entity]||[]).filter(f=>archived||!f.archived);}
export function fieldById(s,entity,id){const f=fieldsFor(s,entity,true).find(f=>f.id===id);if(!f)throw Error('Custom field not found.');return f;}
export function saveField(s,entity,data,id){
 if(!['client','project'].includes(entity))throw Error('Choose clients or projects.');
 const all=fieldsFor(s,entity,true),old=id?fieldById(s,entity,id):null,name=String(data.name||'').trim(),type=old?.type||data.type;
 if(!name||name.length>60)throw Error('Use a field name of 1–60 characters.');
 if(!own(fieldTypes,type))throw Error('Choose a field type.');
 if(old&&data.type&&data.type!==old.type)throw Error('Field types cannot be changed. Create a new field to use another type.');
 if(all.some(f=>f.id!==id&&f.name.toLowerCase()===name.toLowerCase()))throw Error('A field with this name already exists.');
 if(!old&&all.length>=50)throw Error('You can create up to 50 fields per record type.');
 const description=String(data.description||'').trim();if(description.length>300)throw Error('Keep the description under 300 characters.');
 let options=[];
 if(['select','multiselect'].includes(type)){
  if(!Array.isArray(data.options)||!data.options.length||data.options.length>50)throw Error('Add between 1 and 50 options.');
  const names=new Set(),ids=new Set();options=data.options.map(o=>{const label=String(o.label||'').trim();if(!label||label.length>60||names.has(label.toLowerCase()))throw Error('Use unique option names of 1–60 characters.');names.add(label.toLowerCase());const optionId=o.id||uid();if(o.id&&!old?.options.some(x=>x.id===o.id))throw Error('Unknown option ID.');if(ids.has(optionId))throw Error('Duplicate option ID.');ids.add(optionId);return {id:optionId,label};});
  for(const removed of old?.options.filter(o=>!options.some(x=>x.id===o.id))||[]){if((s[entity==='client'?'clients':'projects']||[]).some(r=>{const v=r.customFields?.[id];return Array.isArray(v)?v.includes(removed.id):v===removed.id;}))throw Error(`“${removed.label}” is in use. Clear its values before removing it.`);}
 }
 const f={id:id||`cf_${uid()}`,name,type,description,options,archived:old?.archived||false,createdAt:old?.createdAt||new Date().toISOString()};
 s.customFields??={};s.customFields[entity]??=[];
 if(old)Object.assign(old,f);else s.customFields[entity].push(f);return f;
}
export function archiveField(s,entity,id,archived){const f=fieldById(s,entity,id);if(typeof archived!=='boolean')throw Error('Specify whether to archive the field.');f.archived=archived;return f;}
export function validateFieldValue(field,value){
 if(value===null||value===undefined||value==='')return null;
 if(field.archived)throw Error('Restore this field before editing its values.');
 if(field.type==='checkbox'){if(typeof value!=='boolean')throw Error('Choose checked or unchecked.');return value;}
 if(['number','currency'].includes(field.type)){if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>1e12)throw Error('Enter a finite number between −1 trillion and 1 trillion.');if(field.type==='currency'&&Math.abs(value*100-Math.round(value*100))>.0001)throw Error('Use at most two decimal places.');return value;}
 if(field.type==='select'){if(!field.options.some(o=>o.id===value))throw Error('Choose an available option.');return value;}
 if(field.type==='multiselect'){if(!Array.isArray(value)||value.some(v=>!field.options.some(o=>o.id===v)))throw Error('Choose available options.');return [...new Set(value)];}
 if(typeof value!=='string'||value.length>5000)throw Error('Use text of at most 5,000 characters.');
 value=value.trim();if(!value)return null;
 if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value))throw Error('Enter a valid date.');
 if(field.type==='email'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)||value.length>254))throw Error('Enter a valid email address.');
 if(field.type==='url'){let u;try{u=new URL(value);}catch{throw Error('Enter a full URL starting with https:// or http://.');}if(!['https:','http:'].includes(u.protocol))throw Error('Use an https:// or http:// link.');}
 return value;
}
export function setFieldValue(s,entity,recordId,fieldId,value){const field=fieldById(s,entity,fieldId);if(field.archived)throw Error('Restore this field before editing values.');const r=(s[entity==='client'?'clients':'projects']||[]).find(r=>r.id===recordId);if(!r)throw Error('Record not found.');const valid=validateFieldValue(field,value);r.customFields??={};if(valid===null)delete r.customFields[fieldId];else r.customFields[fieldId]=valid;return r;}
export function fieldDisplay(f,v){if(v==null||Array.isArray(v)&&!v.length)return '';if(f.type==='checkbox')return v?'Checked':'Unchecked';if(f.type==='currency')return new Intl.NumberFormat('en-US',{style:'currency',currency:currencyCode()}).format(v);if(f.type==='select')return f.options.find(o=>o.id===v)?.label||'';if(f.type==='multiselect')return v.map(id=>f.options.find(o=>o.id===id)?.label).filter(Boolean).join(', ');return String(v);}
export function fieldProjection(s,entity,r){return Object.fromEntries(fieldsFor(s,entity).map(f=>[f.id,['number','currency'].includes(f.type)?r.customFields?.[f.id]??null:fieldDisplay(f,r.customFields?.[f.id])]));}
export function matchesFieldFilter(value,filter){const empty=value==null||value===''||Array.isArray(value)&&!value.length;if(filter.op==='empty')return empty;if(filter.op==='not_empty')return !empty;if(empty)return false;const a=String(value).toLowerCase(),b=String(filter.value??'').toLowerCase();switch(filter.op){case'contains':return a.includes(b);case'equals':return a===b;case'gt':return Number.isFinite(Number(filter.value))&&Number(value)>Number(filter.value);case'lt':return Number.isFinite(Number(filter.value))&&Number(value)<Number(filter.value);default:return false;}}
