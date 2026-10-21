import {documentLabel} from './document-labels.js';
// Fill gaps in the account history; existing domain-specific activity is retained.
export function appendMissingActivity(before,after,at=new Date().toISOString()){
 const known=new Set((before.activity||[]).map(n=>n.id)),fresh=(after.activity||[]).filter(n=>!known.has(n.id));
 const add=(text,detail,kind,metadata={})=>{if(fresh.some(n=>n.kind===kind&&String(n.detail).includes(detail)))return;after.activity.unshift({...metadata,id:crypto.randomUUID(),text,detail,kind,createdAt:at,time:'Just now'});};
 for(const [key,label,kind] of [['clients','Client','client'],['projects','Project','project'],['documents','Document','document'],['forms','Form','forms'],['submissions','Form response','forms'],['invoices','Invoice','payment'],['invoiceDrafts','Invoice draft','document'],['emailDrafts','Email draft','mail'],['time','Time entry','time'],['services','Service','document']]){
  const old=new Map((before[key]||[]).map(r=>[r.id,r])),next=new Map((after[key]||[]).map(r=>[r.id,r]));
  for(const [id,r] of next){const prev=old.get(id);if(JSON.stringify(prev)===JSON.stringify(r))continue;add(`${key==='documents'?documentLabel(r):label} ${prev?'updated':'created'}`,r.name||r.title||r.number||r.subject||r.note||label,kind,key==='documents'?{documentId:r.id,documentKind:r.kind}:{});}
  for(const [id,r] of old)if(!next.has(id))add(`${key==='documents'?documentLabel(r):label} deleted`,r.name||r.title||r.number||r.subject||r.note||label,kind,key==='documents'?{documentId:r.id,documentKind:r.kind}:{});
 }
 for(const [a,b,label,kind] of [[before.crm?.notes,after.crm?.notes,'Note','note'],[before.automation?.workflows,after.automation?.workflows,'Workflow','workflows'],[before.scheduling?.types,after.scheduling?.types,'Meeting type','meeting'],[before.scheduling?.meetings,after.scheduling?.meetings,'Meeting','meeting']]){const old=new Map((a||[]).map(r=>[r.id,r]));for(const r of b||[]){const prev=old.get(r.id);if(JSON.stringify(prev)!==JSON.stringify(r))add(`${label} ${r.deletedAt?'deleted':prev?'updated':'created'}`,r.name||r.typeName||(label==='Note'?'Client note':label),kind);}for(const r of a||[])if(!(b||[]).some(n=>n.id===r.id))add(`${label} deleted`,r.name||r.typeName||label,kind);}
 const settings=s=>Object.fromEntries(Object.entries(s||{}).filter(([key])=>!['readNotifications','emailFollowUps'].includes(key)));
 if(JSON.stringify(settings(before.settings))!==JSON.stringify(settings(after.settings)))add('Workspace settings updated','Workspace','settings');
 for(const n of fresh)n.createdAt??=at;
}
