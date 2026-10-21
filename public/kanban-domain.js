import {groupRecords} from './list-view-domain.js';
import {crmRecords} from './crm-domain.js';
import {saveClient,updateProject} from './domain.js';
import {saveForm} from './workspace-domain.js';
import {fieldsFor,setFieldValue} from './custom-fields-domain.js';
import {initWorkflows,validateWorkflow,triggerById,actionById} from './workflow-domain.js';

export const boardDefaults={clients:'tag',projects:'status',documents:'status',invoices:'status',forms:'service',workflows:'status'};
export const boardActions={clients:'client',projects:'project',documents:'document',invoices:'invoice',forms:'edit-form',workflows:'wf-edit'};
const stages={projects:['planned','awaiting deposit','active','completed','cancelled'],documents:['draft','published','accepted','signed','declined'],invoices:['draft','outstanding','overdue','paid'],clients:['active','archived'],forms:['active','archived'],workflows:['Active','Paused']};
const entityFor=scope=>({clients:'client',projects:'project'})[scope];
export const boardFields=fields=>fields.filter(f=>f.group&&(f.custom?['select','checkbox'].includes(f.type):f.type!=='date'));
export function boardRecords(s,scope){
 if(scope!=='workflows')return crmRecords(s,scope);
 const data=initWorkflows(s);
 return data.workflows.map(w=>({...w,raw:w,status:w.enabled?'Active':'Paused',trigger:triggerById(w.triggers[0].type)?.label,action:actionById(w.steps[0].type)?.label,lastRun:data.runs.find(r=>r.workflowId===w.id)?.status||'Not run'}));
}
const orderKey=(scope,config)=>JSON.stringify([scope,config.groupBy]);
const keepsEmptyColumns=(scope,key)=>scope==='clients'&&key==='tag'||scope==='forms'&&['service','tag'].includes(key);
export function boardGroups(s,scope,config,fields,rows,allRows=rows){
 const field=boardFields(fields).find(f=>f.key===config.groupBy);if(!field)return [];
 const custom=fieldsFor(s,entityFor(scope)).find(f=>f.id===field.key);
 const values=custom?.type==='select'?[...custom.options.map(o=>o.label),null]:custom?.type==='checkbox'?['Unchecked','Checked',null]:field.key==='status'?stages[scope]:null;
 const groups=groupRecords(rows,config,[field]);
 const available=groupRecords(values?values.map(v=>({[field.key]:v})):allRows,config,[field]);
 if(keepsEmptyColumns(scope,field.key))available.push(...(s.crm?.boardLanes?.[orderKey(scope,config)]||[]));
 for(const g of available)if(!groups.some(x=>x.key===g.key))groups.push({...g,rows:[]});
 const rank=new Map((s.crm?.boardOrders?.[orderKey(scope,config)]||[]).map((id,i)=>[id,i]));
 if(!config.sort)for(const g of groups)g.rows.sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity));
 return groups.sort((a,b)=>{
  const direction=config.groupDirection==='desc'?-1:1;
  if(values)return (values.indexOf(a.empty?null:a.label)-values.indexOf(b.empty?null:b.label))*direction;
  return a.empty?b.empty?0:1:b.empty?-1:a.label.localeCompare(b.label,undefined,{numeric:true})*direction;
 });
}
export function boardMoveHint(scope,field){
 if(field?.custom||scope==='clients'&&field?.key==='tag'||scope==='forms'&&['service','tag'].includes(field?.key))return 'Drag cards between columns to update this field.';
 if(scope==='projects'&&field?.key==='status')return 'Drag to change stage. Delivery requirements still apply.';
 if(scope==='workflows'&&field?.key==='status')return 'Drag to activate or pause a workflow.';
 if(scope==='invoices'&&field?.key==='status')return 'Drop into a new status to review the invoice. Payments are recorded separately.';
 if(scope==='documents'&&field?.key==='status')return 'Drop into a new status to review the document. Client responses stay with the client.';
 return 'Drag to reorder within a column. Open a record to change its details.';
}
function changeColumn(s,scope,row,field,target){
 if(row.archived)throw Error('Restore this record before moving it to another column.');
 const value=target.empty?null:target.label,raw=row.raw;
 const custom=fieldsFor(s,entityFor(scope)).find(f=>f.id===field.key);
 if(custom){const next=custom.type==='checkbox'?(value===null?null:value==='Checked'):value===null?null:custom.options.find(o=>o.label===value)?.id;if(next===undefined)throw Error('This option is no longer available.');setFieldValue(s,entityFor(scope),row.id,field.key,next);return;}
 if(scope==='clients'&&field.key==='tag'){if(!value)throw Error('Choose a service.');saveClient(s,{...raw,tag:value},row.id);return;}
 if(scope==='forms'&&['service','tag'].includes(field.key)){if(!value)throw Error('Choose a value.');saveForm(s,{...raw,[field.key]:value},row.id);return;}
 if(scope==='projects'&&field.key==='status'){updateProject(s,row.id,{...raw,status:value==='planned'?'inquiry':value});return;}
 if(scope==='workflows'&&field.key==='status'){const enabled=value==='Active';if(enabled)validateWorkflow(s,raw);raw.enabled=enabled;return;}
 if(scope==='invoices'&&field.key==='status')throw Error(value==='paid'?'Record a payment on the invoice to mark it paid.':value==='outstanding'&&row.status==='draft'?'Review and issue this draft invoice first.':'Invoice status follows its issue date, due date, and recorded payments. Review the invoice to make a change.');
 if(scope==='documents'&&field.key==='status')throw Error(value==='published'?'Review and publish this document first.':'Document status follows publishing and the client’s response. Open the document to review the next step.');
 throw Error('Open the record to change this field. You can reorder cards within this column.');
}
// All validation happens on a copy. A rejected move never leaves a partial edit.
export function moveBoardCard(s,{scope,config,fields,id,fromKey,toKey,beforeId=null,reorder=true}){
 if(!boardDefaults[scope])throw Error('This section does not support boards.');
 const next=structuredClone(s),all=boardRecords(next,scope),row=all.find(r=>r.id===id),field=boardFields(fields).find(f=>f.key===config.groupBy);
 if(!row||!field)throw Error('The record or grouping changed. Refresh the board and try again.');
 const source=groupRecords([row],config,[field])[0];if(source.key!==fromKey)throw Error('This record moved while you were viewing it. Try again from its current column.');
 const groups=boardGroups(next,scope,config,fields,all,all),target=groups.find(g=>g.key===toKey);if(!target)throw Error('This column is no longer available.');
 if(beforeId===id)return false;
 if(beforeId&&!target.rows.some(r=>r.id===beforeId))throw Error('The destination card moved. Try again.');
 const changed=source.key!==target.key;
 if(changed)changeColumn(next,scope,row,field,target);
 if(config.sort&&!changed)throw Error('Clear Sort to reorder cards manually.');
 if(changed&&keepsEmptyColumns(scope,field.key)){
  next.crm??={};next.crm.boardLanes??={};
  next.crm.boardLanes[orderKey(scope,config)]=groups.map(({rows,...g})=>g);
 }
 if(reorder&&!config.sort){
  const key=orderKey(scope,config),ids=all.map(r=>r.id),previous=next.crm?.boardOrders?.[key]||[];
  const order=[...new Set([...previous.filter(id=>ids.includes(id)),...ids])].filter(x=>x!==id);
  order.splice(beforeId?order.indexOf(beforeId):order.length,0,id);
  next.crm??={};next.crm.boardOrders??={};next.crm.boardOrders[key]=order;
 }
 Object.assign(s,next);return true;
}
