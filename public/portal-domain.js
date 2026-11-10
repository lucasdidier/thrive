import {projectStatus} from './project-status.js';
import {invoiceStatus,money,addActivity} from './domain.js';
import {deliveryStatus} from './workspace-domain.js';
import {statusLabel} from './status-tone.js';
import {L,language} from './i18n.js';
// English keeps the raw status word in picker details; other languages show the translated label.
const shownStatus=status=>language()==='en'?status:statusLabel(status);
export const portalSections={documents:'Documents',forms:'Forms',invoices:'Invoices',projects:'Projects',meetings:'Meetings'};
export const portalKey=(entity,id,version=null)=>JSON.stringify([entity,id,version]);
const copy=x=>structuredClone(x);
const invoiceClient=(s,i)=>i.clientId||s.projects.find(p=>p.id===i.projectId)?.clientId;
export function portalDefaults(client,settings={}){const defaults=settings.portalDefaults||{};return {enabled:false,title:defaults.title||'Client portal',intro:defaults.intro??'Your shared documents, invoices, and project updates.',sections:Object.fromEntries(Object.keys(portalSections).map(k=>[k,defaults.sections?.[k]??false])),documents:[],forms:[],invoices:[],projects:[],meetings:[]};}
export function portalCandidates(s,clientId){const client=s.clients.find(c=>c.id===clientId);if(!client)throw Error(L('Client not found.'));const projectOpen=id=>!id||s.projects.some(p=>p.id===id&&!p.archived&&p.status!=='cancelled');return {
 documents:s.documents.filter(d=>d.clientId===clientId&&!d.archived&&d.status!=='draft'&&projectOpen(d.projectId)&&d.versions.some(v=>v.number===d.currentVersion&&v.status!=='superseded'&&v.client?.id===clientId)).map(d=>({id:d.id,title:d.title,detail:L('Version {n} · {status}',{n:d.currentVersion,status:shownStatus(d.status)}),version:d.currentVersion})),
 forms:s.forms.filter(f=>f.status==='active'&&!f.archived).map(f=>({id:f.id,title:f.name||f.title,detail:L('One response per assignment')})),
 invoices:s.invoices.filter(i=>i.number&&!i.archived&&invoiceClient(s,i)===clientId).map(i=>({id:i.id,title:i.number,detail:L('{amount} outstanding · {status}',{amount:money(i.amount-i.paid,i.currency||s.settings.currency||'USD'),status:shownStatus(invoiceStatus(i))})})),
 projects:s.projects.filter(p=>p.clientId===clientId&&!p.archived&&p.status!=='cancelled').map(p=>({id:p.id,title:p.name,detail:projectStatus(s,p).name})),
 meetings:(s.scheduling?.meetings||[]).filter(m=>m.clientId===clientId).map(m=>({id:m.id,title:m.typeName,detail:`${m.start} · ${shownStatus(m.status)}`}))
 };}
export function savePortal(s,clientId,data){const c=s.clients.find(c=>c.id===clientId&&!c.archived);if(!c)throw Error(L('Choose an active client.'));const old=c.portal||portalDefaults(c,s.settings),candidates=portalCandidates(s,clientId);if(!data||Object.keys(data).some(k=>!['enabled','title','intro','sections',...Object.keys(portalSections)].includes(k)))throw Error(L('Invalid portal settings.'));
 const portal={...copy(old),...copy(data)};portal.title=String(portal.title||'').trim();portal.intro=String(portal.intro||'').trim();
 for(const section of Object.keys(portalSections)){
 if(!Object.hasOwn(data,section))continue;const values=portal[section];if(!Array.isArray(values)||values.length>200)throw Error(L('Choose up to 200 records per section.'));
 portal[section]=values.map(value=>{const id=typeof value==='string'?value:value?.id,item=candidates[section].find(r=>r.id===id);if(!item)throw Error(({documents:L('A selected document is unavailable or belongs to another client.'),forms:L('A selected form is unavailable or belongs to another client.'),invoices:L('A selected invoice is unavailable or belongs to another client.'),projects:L('A selected project is unavailable or belongs to another client.'),meetings:L('A selected meeting is unavailable or belongs to another client.')})[section]);if(section==='documents')return {id,version:item.version};if(section==='forms')return {id,assignmentId:old.forms.find(f=>f.id===id)?.assignmentId||crypto.randomUUID()};return id;});
 }
 validatePortal(s,clientId,portal);c.portal=portal;addActivity(s,portal.enabled?'Client portal updated':'Client portal paused',c.name,'client');return portal;
}
export function validatePortal(s,clientId,p){
 if(!p||typeof p.enabled!=='boolean'||typeof p.title!=='string'||!p.title.trim()||p.title.length>100||typeof p.intro!=='string'||p.intro.length>1000||!p.sections||Object.keys(p.sections).length!==Object.keys(portalSections).length||Object.keys(portalSections).some(k=>typeof p.sections[k]!=='boolean'))throw Error(L('Check the portal title, introduction, and sections.'));
 for(const key of Object.keys(portalSections)){const list=p[key];if(!Array.isArray(list)||list.length>200)throw Error(L('Invalid portal selection.'));const seen=new Set(),assignments=new Set();for(const ref of list){const id=typeof ref==='string'?ref:ref?.id;if(typeof id!=='string'||seen.has(id))throw Error(L('Duplicate or invalid portal record.'));seen.add(id);
 if(key==='documents'){const d=s.documents.find(d=>d.id===id);if(!d||d.clientId!==clientId||!Number.isSafeInteger(ref.version)||ref.version<1||!d.versions.some(v=>v.number===ref.version&&v.client?.id===clientId))throw Error(L('Choose a published document for this client.'));}
 else if(key==='forms'){if(!s.forms.some(f=>f.id===id)||typeof ref.assignmentId!=='string'||!/^[\da-f-]{36}$/.test(ref.assignmentId))throw Error(L('Invalid portal form assignment.'));if(assignments.has(ref.assignmentId))throw Error(L('Duplicate portal form assignment.'));assignments.add(ref.assignmentId);}
 else if(key==='projects'&&!s.projects.some(r=>r.id===id&&r.clientId===clientId)||key==='invoices'&&!s.invoices.some(r=>r.id===id&&invoiceClient(s,r)===clientId)||key==='meetings'&&!(s.scheduling?.meetings||[]).some(r=>r.id===id&&r.clientId===clientId))throw Error(L('Portal records must belong to this client.'));
 }}return p;
}
export function portalClient(s,id){const c=s.clients.find(c=>c.id===id&&!c.archived&&c.portal?.enabled);if(!c)throw Error(L('This client portal is unavailable.'));return c;}
export function portalEntries(s,clientId,{preview=false}={}){const c=preview?s.clients.find(c=>c.id===clientId):portalClient(s,clientId);if(!c?.portal)return [];const p=c.portal,candidates=portalCandidates(s,clientId),entries=[];
 for(const section of Object.keys(portalSections)){if(!p.sections[section])continue;for(const ref of p[section]){const id=typeof ref==='string'?ref:ref.id,candidate=candidates[section].find(r=>r.id===id);if(!candidate||section==='documents'&&ref.version!==candidate.version)continue;const entity={documents:'document',forms:'form',invoices:'invoice',projects:'project',meetings:'meeting'}[section];entries.push({entity,recordId:id,version:section==='documents'?ref.version:null,assignmentId:section==='forms'?ref.assignmentId:null,key:portalKey(entity,id,section==='documents'?ref.version:section==='forms'?ref.assignmentId:null)});}}
 return entries;
}
export function portalEntry(s,clientId,key){const entry=portalEntries(s,clientId).find(e=>e.key===key);if(!entry||!['document','invoice','form'].includes(entry.entity))throw Error(L('This item is no longer shared in your portal.'));return entry;}
export function portalFormResponse(s,clientId,assignmentId){return s.submissions.find(sub=>sub.clientId===clientId&&sub.portalAssignmentId===assignmentId);}
// This projection is shared by the owner preview and public API. Never return
// records wholesale: only the explicitly selected client-facing properties.
// The workspace logo, resolved like document branding: workspace setting, then document, then invoice design.
function portalLogo(s){const logo=s.settings.workspaceLogo??s.settings.documentDesign?.logo??s.settings.invoiceDesign?.logo??'';return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo)?logo:'';}
export function portalProjection(s,clientId,{preview=false}={}){const c=preview?s.clients.find(c=>c.id===clientId):portalClient(s,clientId),p=c.portal||portalDefaults(c,s.settings),entries=portalEntries(s,clientId,{preview});const items=entries.map(e=>{
 if(e.entity==='document'){const d=s.documents.find(d=>d.id===e.recordId),v=d.versions.find(v=>v.number===e.version),pending=v.status==='published'&&v.responseMode!=='none';return {key:e.key,entity:e.entity,title:v.title,status:pending?'Awaiting '+(v.responseMode==='signature'?'signature':'acceptance'):v.status==='published'?'For information':v.status,detail:`Version ${e.version}`,needsAttention:pending,action:pending?(v.responseMode==='signature'?'Review & sign':'Review document'):'View document'};}
 if(e.entity==='invoice'){const i=s.invoices.find(i=>i.id===e.recordId);return {key:e.key,entity:e.entity,title:i.number,status:invoiceStatus(i),detail:money(i.amount-i.paid,i.currency||s.settings.currency||'USD')+' outstanding',needsAttention:i.paid<i.amount,action:i.paid<i.amount?'Payment instructions':'View invoice'};}
 if(e.entity==='form'){const f=s.forms.find(f=>f.id===e.recordId),response=portalFormResponse(s,clientId,e.assignmentId);return {key:e.key,entity:e.entity,title:f.title,status:response?'Completed':'To complete',detail:response?'Response received':'Requested form',needsAttention:!response,action:response?'View status':'Complete form'};}
 if(e.entity==='project'){const r=s.projects.find(r=>r.id===e.recordId);return {entity:e.entity,title:r.name,status:projectStatus(s,r).name,due:r.due||'',needsAttention:false};}
 const m=s.scheduling.meetings.find(m=>m.id===e.recordId);return {entity:'meeting',title:m.typeName,status:m.status,start:m.start,end:m.end,timeZone:m.timeZone,location:m.location,needsAttention:false};
 });return {entity:'portal',data:{title:p.title,intro:p.intro,business:s.settings.business,currency:s.settings.currency||'USD',clientName:c.name,logo:portalLogo(s),items},actions:[]};
}
