// Stable IDs keep project references intact when a status is renamed. Default names show in the
// current language until the workspace saves its own list.
import {L} from './i18n.js';
export const defaultProjectStatuses = [
 {id:'planned',name:L('Planned'),color:'#87948c'},
 {id:'active',name:L('In progress'),color:'#4285b5'},
 {id:'completed',name:L('Completed'),color:'#42866b'},
 {id:'cancelled',name:L('Cancelled'),color:'#bd6262'},
];
export const normalizedProjectStatus = value => ['inquiry','proposal','declined','awaiting deposit'].includes(value)?'planned':value;
export const projectStatuses = s => s.settings?.projectStatuses || defaultProjectStatuses;
export const projectStatus = (s,p) => projectStatuses(s).find(x=>x.id===normalizedProjectStatus(p.status)) || {id:p.status,name:p.status,color:'#87948c'};
export function validateProjectStatuses(input){
 if(!Array.isArray(input)||!input.length||input.length>30)throw Error(L('Use between 1 and 30 project statuses.'));
 const ids=new Set(),names=new Set();
 return input.map(x=>{const id=String(x.id||''),name=String(x.name||'').trim(),color=String(x.color||'');
 if(!/^[\w-]{1,100}$/.test(id)||ids.has(id)||!name||name.length>60||names.has(name.toLowerCase())||!/^#[a-f\d]{6}$/i.test(color))throw Error(L('Each status needs a unique name, identifier, and valid color.'));
 ids.add(id);names.add(name.toLowerCase());return {id,name,color};});
}
export function saveProjectStatuses(s,input){
 const next=validateProjectStatuses(input);
 for(const p of s.projects)if(!next.some(x=>x.id===normalizedProjectStatus(p.status)))throw Error(L('Move projects out of a status before removing it.'));
 for(const id of ['planned','active','completed','cancelled'])if(!next.some(x=>x.id===id))throw Error(L('The four default statuses can be renamed, but cannot be removed.'));
 for(const w of s.automation?.workflows||[]){const used=[...(w.triggers||[]).filter(t=>t.type==='project.status_changed').map(t=>t.filter?.value),...(w.steps||[]).filter(a=>a.type==='project.status').map(a=>a.config?.status)].filter(Boolean);if(used.some(id=>!next.some(x=>x.id===normalizedProjectStatus(id))))throw Error(L('Update workflows using this status before removing it.'));}
 s.settings.projectStatuses=next;
}
