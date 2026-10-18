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
// Explicit allowlists keep internal notes, tags, custom fields and relationships out.
export function clientProjection(state,link){
 const {record}=shareTarget(state,link.entity,link.recordId);
 if(link.entity==='document'){
  const v=record.versions.find(x=>x.number===link.version);
  const data=pick(v,['title','kind','responseMode','scope','deliverables','terms','number','status','business','budget','billing','createdAt','completedAt','declinedAt']);
  data.client=pick(v.client,['name','contact','email']);
  data.offers=(v.offers||[]).map(o=>pick(o,['id','name','description','rate','mode','group','min','max','quantity']));
  data.selections=v.selections||null;
  data.agreedItems=(v.agreedItems||[]).map(o=>pick(o,['name','description','quantity','rate','amount']));
  data.billingPlan=(v.billingPlan||[]).map(r=>({...pick(r,['name','percent','amount']),trigger:r.phaseId?`${v.phases.find(p=>p.id===r.phaseId)?.name||'Milestone'} approved`:'On completion'}));
  data.response=v.response?pick(v.response,['name','action','at','consent']):null;
  data.signature=v.signature?pick(v.signature,['name','simulated']):null;
  return {entity:'document',data,actions:v.status==='published'?(v.responseMode==='signature'?['sign','decline']:v.responseMode==='acceptance'?['accept','decline']:[]):[]};
 }
 if(link.entity==='invoice'){
  const data=pick(record,['number','business','clientName','clientEmail','billingAddress','projectName','issued','due','amount','paid','subtotal','taxRate','taxAmount','notes','paymentInstructions','kind','label']);
  data.items=(record.items||[{description:record.label||record.kind,quantity:1,rate:record.amount,amount:record.amount}]).map(i=>pick(i,['description','quantity','rate','amount']));
  data.design=pick(record.design,['template','color','logo','issuerDetails','footer']);
  return {entity:'invoice',data:{...data,status:invoiceStatus(record)},actions:[]};
 }
 return {entity:'form',data:{...pick(record,['title','intro','collectBudget','collectDate','question','questionRequired']),business:state.settings.business},actions:['submit']};
}
function validateInput(body,entity){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new StoreError('Invalid response.');
 if(typeof body.request_id!=='string'||!/^[a-zA-Z0-9_-]{8,64}$/.test(body.request_id))throw new StoreError('A unique request_id is required.');
 const allowed=entity==='form'?['request_id','action','data','form_revision']:['request_id','action','name','consent','selections'];
 if(Object.keys(body).some(k=>!allowed.includes(k)))throw new StoreError('Unsupported response field.');
 if(entity==='form'){
  if(body.action!=='submit'||!body.data||typeof body.data!=='object'||Array.isArray(body.data))throw new StoreError('Invalid form submission.');
  const fields={name:100,contact:100,email:254,project:100,scope:10000,due:10,answer:1000,website:200};
  for(const [k,v]of Object.entries(body.data)){if(k==='budget'){if(v!==''&&(!Number.isSafeInteger(v)||v<1||v>10000000000))throw new StoreError('Enter a valid estimated budget.');continue;}if(!fields[k]||typeof v!=='string'||v.length>fields[k])throw new StoreError('Check the form fields and their lengths.');}
  if(body.data.website)throw new StoreError('Unable to submit this form.');
 }else{
  if(!['accept','sign','decline'].includes(body.action))throw new StoreError('Unsupported document response.');
  if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)throw new StoreError('Enter your full name.');
  if(body.action!=='decline'&&body.consent!==true)throw new StoreError('Confirm that you agree to this document.');
  if(body.selections!==undefined&&(!Array.isArray(body.selections)||body.selections.length>20||body.selections.some(s=>!s||typeof s.id!=='string'||s.id.length>100||!Number.isSafeInteger(s.quantity))))throw new StoreError('Check your service selections.');
 }
}
export async function respondToShare(db,token,body){
 for(let attempt=0;attempt<3;attempt++){
  const current=await resolveShare(db,token),{state,link,owner,revision}=current;
  if(link.entity==='invoice')throw new StoreError('Invoices are read-only.',405);
  validateInput(body,link.entity);
  const key=`share:${link.id}:${(await hashRequest(body.request_id)).slice(0,32)}`,hash=await hashRequest(body),prior=await receiptFor(db,owner,key,hash);
  if(prior)return {ok:prior.ok,message:prior.message,replayed:true};
  if(link.entity==='form'&&body.form_revision!==await hashRequest(clientProjection(state,link).data))throw new StoreError('This form has changed. Reload before submitting your request.',409);
  if(!clientProjection(state,link).actions.includes(body.action))throw new StoreError('This item no longer accepts that response. Reload to see its current status.',409);
  const next=structuredClone(state),before=snapshotWorkspace(state),nextLink=next.shareLinks.find(l=>l.id===link.id),at=new Date().toISOString();
  if(link.entity==='form'){
   if(nextLink.submissionWindow&&Date.now()-Date.parse(nextLink.submissionWindow)<3600000&&nextLink.submissionCount>=30)throw new StoreError('This form has received too many submissions. Try again later.',429);
   if(!nextLink.submissionWindow||Date.now()-Date.parse(nextLink.submissionWindow)>=3600000){nextLink.submissionWindow=at;nextLink.submissionCount=0;}
   nextLink.submissionCount=(nextLink.submissionCount||0)+1;
   try{submitForm(next,link.recordId,body.data,key);}catch(e){if(/archived/.test(e.message))throw new StoreError('Unable to submit this request. Contact the sender.');throw e;}
  }else{
   respondDocument(next,link.recordId,link.version,body.action,{name:body.name,consent:body.consent,selections:body.selections});
   const d=next.documents.find(d=>d.id===link.recordId),v=d.versions.find(v=>v.number===link.version);
   v.response={action:body.action,name:body.name.trim(),consent:body.consent===true,at,source:'client-link',linkId:link.id};
   if(body.action==='decline')v.declinedAt=at;
   if(body.action==='sign')v.signature={name:body.name.trim(),simulated:false};
   const activity=next.activity.find(a=>a.text==='Document signed (demo)');if(activity&&body.action==='sign')activity.text='Document signed';
  }
  const events=[];runWorkflows(next,before,e=>events.push(e));validateWorkspace(next,state);
  const result={ok:true,message:link.entity==='form'?'Your request has been received.':body.action==='decline'?'Document declined.':body.action==='sign'?'Document signed.':'Document accepted.'};
  try{const saved=await commitWorkspace(db,owner,revision,next,key,hash,result,events);return {ok:saved.ok,message:saved.message};}catch(e){if(e.status!==409||attempt===2)throw e;}
 }
}
export async function handleShared(request,db,token){try{
 if(request.method==='GET'){const {state,link}=await resolveShare(db,token);const result=clientProjection(state,link);if(link.entity==='form')result.formRevision=await hashRequest(result.data);return json(result);}
 if(request.method==='POST'){checkOrigin(request);if(Number(request.headers.get('content-length'))>20000)throw new StoreError('Response is too large.',413);return json(await respondToShare(db,token,await readBody(request,20000)));}
 return json({error:'Method not allowed.'},405);
 }catch(e){return errorResponse(e);}}
