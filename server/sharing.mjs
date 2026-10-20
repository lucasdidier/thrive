import {documentLabel} from '../public/document-labels.js';
import {notifyFormResponse} from './form-notifications.mjs';
import {portalProjection,portalEntry,portalFormResponse} from '../public/portal-domain.js';
import {validateDocumentDesign,pricingVisible} from '../public/document-design.js';
import {validQuantity} from '../public/pricing.js';
import {publicFormData,validateFormAnswers} from '../public/form-domain.js';
import {validateUploadedAnswers} from './form-files.mjs';
import {validShareToken,linkAvailable,shareTarget} from '../public/share-domain.js';
import {respondDocument,submitForm} from '../public/workspace-domain.js';
import {snapshotWorkspace,runWorkflows} from '../public/workflow-domain.js';
import {invoiceStatus} from '../public/domain.js';
import {validateWorkspace} from './validation.mjs';
import {loadWorkspace,hashRequest,receiptFor,commitWorkspace,StoreError} from './store.mjs';
import {json,checkOrigin,readBody,errorResponse} from './http.mjs';
const pick=(object,keys)=>Object.fromEntries(keys.filter(k=>object?.[k]!==undefined).map(k=>[k,object[k]]));
const unavailable=()=>new StoreError('This link is unavailable. Ask the sender for a new link.',404);
export async function resolveShare(db,token){
 if(!validShareToken(token))throw unavailable();
 const entry=await db.prepare('SELECT owner_id,share_id FROM share_links WHERE token_hash=?').bind(await hashRequest(token)).first();
 if(!entry)throw unavailable();
 const current=await loadWorkspace(db,entry.owner_id),link=current?.state.shareLinks?.find(l=>l.id===entry.share_id&&l.token===token);
 if(!current||!linkAvailable(current.state,link))throw unavailable();
 return {...current,link,owner:entry.owner_id};
}
/** @param {any} db @param {string} token @param {string|null} [item] */
export async function resolveSharedResource(db,token,item=null){
 const current=await resolveShare(db,token);
 if(!item)return current;
 if(current.link.entity!=='portal')throw unavailable();
 let entry;try{entry=portalEntry(current.state,current.link.recordId,item);}catch{throw unavailable();}
 return {...current,portalContext:{clientId:current.link.recordId,assignmentId:entry.assignmentId,key:entry.key},link:{...current.link,entity:entry.entity,recordId:entry.recordId,version:entry.version}};
}
// Explicit allowlists keep internal notes, tags, custom fields and relationships out.
export function clientProjection(state,link){
 if(link.entity==='portal')return portalProjection(state,link.recordId);
 const {record}=shareTarget(state,link.entity,link.recordId);
 if(link.entity==='document'){
  const v=record.versions.find(x=>x.number===link.version);
  const data=pick(v,['currency','design','showPricing','selectionMode','pricingEstimated','title','kind','responseMode','scope','deliverables','terms','number','status','business','budget','billing','createdAt','completedAt','declinedAt']);
  data.client=pick(v.client,['name','contact','email']);
  data.offers=(pricingVisible(v)?v.offers||[]:[]).map(o=>pick(o,['id','name','description','rate','billingModel','unit','mode','group','min','max','quantity']));
  data.selections=pricingVisible(v)?v.selections||null:null;
  data.agreedItems=(pricingVisible(v)?v.agreedItems||[]:[]).map(o=>pick(o,['name','description','quantity','rate','amount','billingModel','unit']));
  if(v.design)data.design=validateDocumentDesign(v.design);if(!pricingVisible(v)){delete data.budget;data.billing=false;}
  data.billingPlan=(pricingVisible(v)?v.billingPlan||[]:[]).map(r=>({...pick(r,['name','percent','amount']),trigger:r.phaseId?`${v.phases.find(p=>p.id===r.phaseId)?.name||'Milestone'} approved`:'On completion'}));
  data.response=v.response?pick(v.response,['name','action','at','consent']):null;
  data.signature=v.signature?pick(v.signature,['name','simulated']):null;
  return {entity:'document',data,actions:v.status==='published'?(v.responseMode==='signature'?['sign','decline']:v.responseMode==='acceptance'?['accept','decline']:[]):[]};
 }
 if(link.entity==='invoice'){
  const data=pick(record,['currency','number','business','clientName','clientEmail','billingAddress','projectName','issued','due','amount','paid','subtotal','taxRate','taxAmount','notes','paymentInstructions','kind','label']);
  data.items=(record.items||[{description:record.label||record.kind,quantity:1,rate:record.amount,amount:record.amount}]).map(i=>({...pick(i,['description','details','quantity','rate','amount','billingModel','unit']),...(i.timeSources?{durationMinutes:i.timeSources.reduce((n,x)=>n+x.minutes,0)}:{})}));
  data.design=pick(record.design,['template','color','logo','issuerDetails','footer']);
  return {entity:'invoice',data:{...data,status:invoiceStatus(record)},actions:[]};
 }
 return {entity:'form',data:publicFormData(record,state.settings.business),actions:['submit']};
}
function validateInput(body,entity){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new StoreError('Invalid response.');
 if(typeof body.request_id!=='string'||!/^[a-zA-Z0-9_-]{8,64}$/.test(body.request_id))throw new StoreError('A unique request_id is required.');
 const allowed=entity==='form'?['request_id','action','data','form_revision']:['request_id','action','name','consent','selections'];
 if(Object.keys(body).some(k=>!allowed.includes(k)))throw new StoreError('Unsupported response field.');
 if(entity==='form'){
  if(body.action!=='submit'||!body.data||typeof body.data!=='object'||Array.isArray(body.data))throw new StoreError('Invalid form submission.');
  const fields={name:100,contact:100,email:254,project:100,scope:10000,due:10,answer:1000,website:200};
  for(const [k,v]of Object.entries(body.data)){if(k==='answers'){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length>50)throw new StoreError('Invalid form answers.');continue;}if(k==='budget'){if(v!==''&&(!Number.isSafeInteger(v)||v<1||v>10000000000))throw new StoreError('Enter a valid estimated budget.');continue;}if(!fields[k]||typeof v!=='string'||v.length>fields[k])throw new StoreError('Check the form fields and their lengths.');}
  if(body.data.website)throw new StoreError('Unable to submit this form.');
 }else{
  if(!['accept','sign','decline'].includes(body.action))throw new StoreError('Unsupported document response.');
  if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)throw new StoreError('Enter your full name.');
  if(body.action!=='decline'&&body.consent!==true)throw new StoreError('Confirm that you agree to this document.');
  if(body.selections!==undefined&&(!Array.isArray(body.selections)||body.selections.length>20||body.selections.some(s=>!s||typeof s.id!=='string'||s.id.length>100||!validQuantity(s.quantity))))throw new StoreError('Check your service selections.');
 }
}
export async function respondToShare(db,token,body,item=null,{env,notify=notifyFormResponse}={}){
 const deliver=async(owner,state,key)=>{if(!env)return;const sub=state.submissions.find(s=>s.key===key);if(sub)try{await notify(db,owner,sub.id,env);}catch{console.warn("Form notification could not be delivered; response remains saved.");}};
 for(let attempt=0;attempt<3;attempt++){
  const current=await resolveSharedResource(db,token,item),{state,link,owner,revision,portalContext}=current;
  if(link.entity==='portal')throw new StoreError('Choose an item in the client portal.',405);
  if(link.entity==='invoice')throw new StoreError('Invoices are read-only.',405);
  validateInput(body,link.entity);
  const key=`share:${link.id}:${(await hashRequest(portalContext?[portalContext.key,body.request_id]:body.request_id)).slice(0,32)}`,hash=await hashRequest(body),prior=await receiptFor(db,owner,key,hash);
  if(prior){if(link.entity==='form')await deliver(owner,state,`${link.recordId}:${key}`);return {ok:prior.ok,message:prior.message,replayed:true};}
  if(portalContext&&link.entity==='form'&&portalFormResponse(state,portalContext.clientId,portalContext.assignmentId))throw new StoreError('This form has already been completed.',409);
  if(portalContext&&link.entity==='form'&&body.data.answers===undefined)throw new StoreError('Reload this form and complete its questions.');
  if(link.entity==='form'&&body.form_revision!==await hashRequest(clientProjection(state,link).data))throw new StoreError('This form has changed. Reload before submitting your request.',409);
  if(!clientProjection(state,link).actions.includes(body.action))throw new StoreError('This item no longer accepts that response. Reload to see its current status.',409);
  const next=structuredClone(state),before=snapshotWorkspace(state),nextLink=next.shareLinks.find(l=>l.id===link.id),at=new Date().toISOString();
  if(link.entity==='form'){
   if(nextLink.submissionWindow&&Date.now()-Date.parse(nextLink.submissionWindow)<3600000&&nextLink.submissionCount>=30)throw new StoreError('This form has received too many submissions. Try again later.',429);
   if(!nextLink.submissionWindow||Date.now()-Date.parse(nextLink.submissionWindow)>=3600000){nextLink.submissionWindow=at;nextLink.submissionCount=0;}
   nextLink.submissionCount=(nextLink.submissionCount||0)+1;
   try{if(body.data.answers!==undefined){const f=next.forms.find(f=>f.id===link.recordId),checked=validateFormAnswers(f,body.data.answers);await validateUploadedAnswers(db,owner,f.id,checked.snapshots,{shareId:link.id,requestId:body.request_id,revision:body.form_revision});}submitForm(next,link.recordId,body.data,key,portalContext||{});}catch(e){if(/archived/.test(e.message))throw new StoreError('Unable to submit this request. Contact the sender.');throw e;}
  }else{
   respondDocument(next,link.recordId,link.version,body.action,{name:body.name,consent:body.consent,selections:body.selections});
   const d=next.documents.find(d=>d.id===link.recordId),v=d.versions.find(v=>v.number===link.version);
   v.response={action:body.action,name:body.name.trim(),consent:body.consent===true,at,source:'client-link',linkId:link.id};
   if(body.action==='decline')v.declinedAt=at;
   if(body.action==='sign')v.signature={name:body.name.trim(),simulated:false};
   const activity=next.activity.find(a=>a.documentId===d.id&&a.text.endsWith(' signed (demo)'));if(activity&&body.action==='sign')activity.text=activity.text.replace(' (demo)','');
  }
  const events=[];runWorkflows(next,before,e=>events.push(e));validateWorkspace(next,state);
  const result={ok:true,message:link.entity==='form'?'Your request has been received.':`${documentLabel(next.documents.find(d=>d.id===link.recordId))} ${body.action==='decline'?'declined':body.action==='sign'?'signed':'accepted'}.`};
  try{const saved=await commitWorkspace(db,owner,revision,next,key,hash,result,events);if(link.entity==='form')await deliver(owner,next,`${link.recordId}:${key}`);return {ok:saved.ok,message:saved.message};}catch(e){if(e.status!==409||attempt===2)throw e;}
 }
}
export async function handleShared(request,db,token,env){try{
 const item=new URL(request.url).searchParams.get('item');
 if(request.method==='GET'){const {state,link,portalContext}=await resolveSharedResource(db,token,item);const result=clientProjection(state,link);if(link.entity==='form'){result.formRevision=await hashRequest(result.data);if(portalContext&&portalFormResponse(state,portalContext.clientId,portalContext.assignmentId)){result.actions=[];result.completed=true;}}if(portalContext)result.portal={title:state.clients.find(c=>c.id===portalContext.clientId).portal.title};return json(result);}
 if(request.method==='POST'){checkOrigin(request);const scope=await resolveSharedResource(db,token,item),limit=scope.link.entity==='form'?600000:20000;if(Number(request.headers.get('content-length'))>limit)throw new StoreError('Response is too large.',413);return json(await respondToShare(db,token,await readBody(request,limit),item,{env}));}
 return json({error:'Method not allowed.'},405);
 }catch(e){return errorResponse(e);}}
