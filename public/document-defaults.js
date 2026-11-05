// Proposal and contract templates and defaults. Built-in templates can be edited (stored as an
// override with the same id) and new ones saved. Documents copy template text when created, so
// editing a template never changes existing or published documents.
import {documentTemplates} from './document-design.js';
import {uid} from './domain.js';
export const documentDefaultKinds={proposal:{label:'Proposals',responseMode:'acceptance'},contract:{label:'Contracts',responseMode:'signature'}};
export const responseModes=[['acceptance','Acceptance'],['signature','Signature'],['none','No response']];
const kindMatches=(t,kind)=>t.kind===kind||(kind==='contract'&&t.kind==='agreement');
export function allTemplates(s,kind){
 const saved=s?.settings?.documentTemplates||[];
 const list=[...documentTemplates.map(t=>{const o=saved.find(c=>c.id===t.id);return {...t,...(o||{}),builtIn:true,edited:!!o};}),...saved.filter(c=>!documentTemplates.some(t=>t.id===c.id)).map(c=>({...c,builtIn:false,edited:false}))];
 return kind?list.filter(t=>kindMatches(t,kind)):list;
}
export const templatesFor=(s,kind)=>allTemplates(s,kind);
const text=(v,max,label)=>{const x=String(v??'').trim();if(x.length>max)throw Error(`Keep ${label} under ${max.toLocaleString('en-US')} characters.`);return x;};
function cleanTemplate(data,kind){
 const name=text(data.name,80,'the template name');if(!name)throw Error('Name the template.');
 return {name,kind,scope:text(data.scope,5000,'the scope'),deliverables:text(data.deliverables,5000,'the deliverables'),terms:text(data.terms,5000,'the terms'),showPricing:data.showPricing!==false,selectionMode:['fixed','single','multiple','advanced'].includes(data.selectionMode)?data.selectionMode:'fixed'};
}
// Saves into state.settings.documentTemplates. `asNew` always creates a separate template.
export function saveDocumentTemplate(s,data,id,{asNew=false}={}){
 const current=id?allTemplates(s).find(t=>t.id===id):null;if(id&&!current)throw Error('Template not found.');
 const kind=current?.kind||(data.kind==='contract'?'contract':'proposal');
 const base={showPricing:current?.showPricing,selectionMode:current?.selectionMode};
 const next={...cleanTemplate({...base,...data},kind),id:asNew||!id?'tpl_'+uid():id};
 const list=(s.settings.documentTemplates||[]).filter(t=>t.id!==next.id);
 if(list.length>=50)throw Error('You can keep up to 50 custom templates.');
 s.settings.documentTemplates=[...list,next];return next;
}
// Custom templates are removed; edited built-ins return to their original text.
export function removeDocumentTemplate(s,id){
 s.settings.documentTemplates=(s.settings.documentTemplates||[]).filter(t=>t.id!==id);
 for(const kind of Object.keys(documentDefaultKinds))if(s.settings.documentDefaults?.[kind]?.templateId===id&&!allTemplates(s,kind).some(t=>t.id===id))s.settings.documentDefaults[kind].templateId='';
}
export function validateDocumentTemplates(list){
 if(!Array.isArray(list)||list.length>50)throw Error('Invalid document templates.');
 const ids=new Set();for(const t of list){if(!t||typeof t.id!=='string'||!/^[\w-]{1,60}$/.test(t.id)||ids.has(t.id)||!['proposal','contract','agreement'].includes(t.kind))throw Error('Invalid document template.');ids.add(t.id);cleanTemplate(t,t.kind);}
 return list;
}
export function documentDefaults(s,kind){
 const base=documentDefaultKinds[kind],saved=s.settings?.documentDefaults?.[kind]||{};
 if(!base)return {templateId:'',responseMode:'',terms:''};
 return {templateId:allTemplates(s,kind).some(t=>t.id===saved.templateId)?saved.templateId:'',responseMode:responseModes.some(([v])=>v===saved.responseMode)?saved.responseMode:base.responseMode,terms:typeof saved.terms==='string'?saved.terms:''};
}
export function validateDocumentDefaults(d,s){
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).some(k=>!documentDefaultKinds[k]))throw Error('Invalid document defaults.');
 for(const [kind,v] of Object.entries(d)){
  if(!v||typeof v!=='object'||typeof v.templateId!=='string'||(v.templateId&&!allTemplates(s,kind).some(t=>t.id===v.templateId)))throw Error('Choose a template for '+documentDefaultKinds[kind].label.toLowerCase()+'.');
  if(!responseModes.some(([m])=>m===v.responseMode))throw Error('Choose a response type.');
  if(typeof v.terms!=='string'||v.terms.length>5000)throw Error('Keep standard terms under 5,000 characters.');
 }
 return d;
}
