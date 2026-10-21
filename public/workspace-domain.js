import {documentLabel} from './document-labels.js';
import {formDesign} from './form-design.js';
import {templateContent,defaultDocumentDesign,validateDocumentDesign,pricingVisible} from './document-design.js';
import {hasTimePricing} from './pricing.js';
import {normalizeQuestions,validateFormAnswers} from './form-domain.js';
import {uid,today,addActivity,allocatePlan,defaultPlan,acceptProposal,submitInquiry,saveIntake,saveClient,createProject} from './domain.js';
import {validateOffers,quoteOffers,applySelectionMode} from './services-domain.js';
const copy=x=>JSON.parse(JSON.stringify(x)), clean=x=>String(x??'').trim();
export const responseLabels={acceptance:'Acceptance',signature:'Signature',none:'No response'};
export const kindLabels={proposal:'Proposal',contract:'Contract',agreement:'Proposal + contract',document:'Document'};
const documentActivity=(s,d,action)=>addActivity(s,`${documentLabel(d)} ${action}`,d.title,'document',{documentId:d.id,documentKind:d.kind});
export const deliveryStatus=p=>['inquiry','proposal','declined'].includes(p.status)?'planned':p.status;
const getDoc=(s,id)=>{const d=s.documents.find(d=>d.id===id);if(!d)throw Error('Document not found.');return d;};
const getForm=(s,id)=>{const f=s.forms.find(f=>f.id===id);if(!f)throw Error('Form not found.');return f;};
const ensureOpen=(s,d)=>{if(d.archived)throw Error('Restore the document first.');const p=s.projects.find(p=>p.id===d.projectId);if(p?.archived||p?.status==='cancelled')throw Error('Restore or reopen the linked project first.');};
export function upgradeWorkspace(s){
 if(s.workspaceSchema===3)return s;
 s.forms=[{...copy(s.intake),id:'form-inquiry',name:s.intake.title,status:'active',createdAt:today()}];
 s.submissions.forEach(x=>{x.formId??='form-inquiry';const p=s.projects.find(p=>p.id===x.projectId);x.formTitle??=s.intake.title;x.scope??=p?.inquiry?.scope||'';x.question??=p?.inquiry?.question||'';x.answer??=p?.inquiry?.answer||'';});
 s.documents=s.projects.map(p=>{
  const d={id:`doc-${p.id}`,title:p.name,kind:'proposal',responseMode:'acceptance',clientId:p.clientId,projectId:p.id,billing:true,scope:p.proposal,deliverables:p.deliverables||'',terms:'',budget:p.budget,phases:copy(p.phases),billingPlan:copy(p.billingPlan),due:p.due,status:p.proposalStatus,archived:false,currentVersion:p.currentVersion,createdAt:today(),updatedAt:today()};
  d.versions=p.versions.map(v=>({...copy(d),versions:undefined,number:v.number,title:v.name,scope:v.scope,deliverables:v.deliverables,client:copy(v.client),business:v.business,budget:v.budget,phases:copy(v.phases),billingPlan:copy(v.billingPlan),due:v.due,status:v.status,createdAt:v.createdAt,completedAt:p.acceptedAt||null}));
  p.billingDocumentId=d.id;return d;
 });
 const deposit=s.workflows.find(w=>w.id==='w1');if(deposit)deposit.description='Billing document completed → deposit invoice → delivery';
 s.workspaceSchema=3;return s;
}
export function createDocument(s,data){
 const client=s.clients.find(c=>c.id===data.clientId&&!c.archived);if(!client)throw Error('Choose an active client.');
 const p=data.projectId?s.projects.find(p=>p.id===data.projectId):null;if(data.projectId&&(!p||p.clientId!==client.id||p.archived||p.status==='cancelled'))throw Error('Choose an active project for this client.');
 const starter=data.templateId?templateContent(data.templateId,{business:s.settings.business,client:client.name}):{};data={...starter,...data};const design=validateDocumentDesign(data.design||defaultDocumentDesign(s));
 const kind=data.kind||'proposal';if(!kindLabels[kind])throw Error('Choose a document type.');
 const phases=copy(p?.phases||s.settings.phases.map(name=>({id:uid(),name,done:false}))),budget=p?.budget||0;
 const d={id:uid(),currency:p?.currency||s.settings.currency||'USD',design,templateId:data.templateId||null,showPricing:data.showPricing??true,selectionMode:data.selectionMode||'advanced',title:clean(data.title)||starter.title||`${client.name} ${kind==='agreement'?'agreement':kindLabels[kind].toLowerCase()}`,kind,responseMode:kind==='contract'||kind==='agreement'?'signature':kind==='document'?'none':'acceptance',clientId:client.id,projectId:p?.id||null,billing:!!p&&!p.billingDocumentId&&kind!=='document'&&data.showPricing!==false&&!['time-agreement','retainer'].includes(data.templateId),budget,phases,billingPlan:copy(p?.billingPlan||[]),scope:data.scope??p?.proposal??'',deliverables:data.deliverables||'',terms:data.terms||'',due:p?.due||'',status:'draft',archived:false,currentVersion:null,versions:[],createdAt:today(),updatedAt:today()};
 if(d.billing){p.billingDocumentId=d.id;if(budget&&!d.billingPlan.length)d.billingPlan=defaultPlan(budget,s.settings.deposit,phases);}
 s.documents.unshift(d);documentActivity(s,d,'created');return d;
}
export function saveDocument(s,id,data){
 const d=getDoc(s,id);ensureOpen(s,d);if(d.status!=='draft')throw Error('Create a revision before editing this document.');
 const title=clean(data.title),scope=clean(data.scope),kind=data.kind||d.kind,responseMode=data.responseMode||d.responseMode;
 if(!title||!scope)throw Error('Enter a document title and content.');if(!kindLabels[kind]||!responseLabels[responseMode])throw Error('Choose a valid type and response requirement.');
 if(data.showPricing!==undefined&&typeof data.showPricing!=='boolean')throw Error('Pricing visibility must be on or off.');const showPricing=data.showPricing??pricingVisible(d),selectionMode=data.selectionMode||d.selectionMode||'advanced',design=validateDocumentDesign(data.design||d.design||defaultDocumentDesign(s)),offers=validateOffers(applySelectionMode(data.offers??d.offers??[],selectionMode)),visibleOffers=showPricing?offers:[];if(visibleOffers.some(o=>o.mode!=='required'||o.min!==o.max)&&responseMode==='none')throw Error('Selectable services require acceptance or signature.');const quote=visibleOffers.length?quoteOffers(visibleOffers):null;
 const billing=!!data.billing,p=s.projects.find(p=>p.id===d.projectId);let phases=copy(d.phases),billingPlan=copy(d.billingPlan),budget=d.budget;
 if(billing){
  if(!showPricing)throw Error('Show pricing before enabling project billing.');if(hasTimePricing(visibleOffers))throw Error('Time & materials are estimates. Turn off automatic project billing and invoice actual quantities.');
  if(!p)throw Error('Link a project before enabling billing.');if(responseMode==='none')throw Error('Billing requires acceptance or signature. Turn off billing for an information-only document.');
  if(p.accepted||s.documents.some(x=>x.id!==id&&x.projectId===p.id&&x.billing))throw Error('This project already has a billing agreement.');
  const names=(data.phases||d.phases.map(f=>f.name)).map(clean);if(!names.length||names.length>8||names.some(x=>!x)||new Set(names.map(x=>x.toLowerCase())).size!==names.length)throw Error('Enter one to eight unique delivery phases.');
  phases=names.map((name,i)=>({id:data.phaseIds?.[i]||d.phases[i]?.id||uid(),name,done:false}));budget=quote?.amount??Number(data.budget);billingPlan=allocatePlan(budget,data.rules||d.billingPlan,phases);
 }
 if(quote)budget=quote.amount;
 Object.assign(d,{offers,showPricing,selectionMode,design,title,scope,kind,responseMode,billing,phases,billingPlan,budget,deliverables:clean(data.deliverables),terms:clean(data.terms),updatedAt:today()});
 if(p){if(billing)p.billingDocumentId=id;else if(p.billingDocumentId===id)delete p.billingDocumentId;}
 documentActivity(s,d,'draft saved');return d;
}
export function publishDocument(s,id){
 const d=getDoc(s,id);ensureOpen(s,d);if(d.status!=='draft')throw Error('Only a draft can be published.');if(!d.title||!clean(d.scope))throw Error('Add document content first.');
 if(pricingVisible(d)&&d.offers?.length){quoteOffers(d.offers);if(d.responseMode==='none'&&d.offers.some(o=>o.mode!=='required'||o.min!==o.max))throw Error('Selectable services require a response.');}
 if(d.billing){if(!pricingVisible(d)||hasTimePricing(d.offers||[]))throw Error('Automatic project billing needs visible, fixed-fee pricing.');if(d.responseMode==='none')throw Error('Billing requires a response.');allocatePlan(d.budget,d.billingPlan,d.phases);}
 const v={...copy(d),versions:undefined,number:d.versions.length+1,client:copy(s.clients.find(c=>c.id===d.clientId)),business:s.settings.business,currency:s.projects.find(p=>p.id===d.projectId)?.currency||s.settings.currency||'USD',status:'published',createdAt:new Date().toISOString()};
 d.versions.push(v);d.currentVersion=v.number;d.status='published';d.updatedAt=today();documentActivity(s,d,'published');return v;
}
export function reviseDocument(s,id){const d=getDoc(s,id);ensureOpen(s,d);if(['accepted','signed'].includes(d.status))throw Error('Completed agreements cannot be revised in this prototype.');if(d.status==='draft')return d;d.versions.forEach(v=>{if(v.status==='published')v.status='superseded';});d.status='draft';d.currentVersion=null;return d;}
export function deleteDocumentDraft(s,id){
 const d=getDoc(s,id);
 if(d.status!=='draft'||d.versions.length)throw Error('Published documents cannot be deleted. Archive the document to keep its history.');
 if(s.projects.some(p=>p.accepted&&p.billingDocumentId===id))throw Error('This document belongs to a completed billing agreement.');
 for(const p of s.projects)if(p.billingDocumentId===id)delete p.billingDocumentId;
 s.documents=s.documents.filter(d=>d.id!==id);
 documentActivity(s,d,'draft deleted');
}
export function respondDocument(s,id,number,action,signature={}){
 const d=getDoc(s,id);ensureOpen(s,d);const v=d.versions.find(v=>v.number===Number(number));if(!v||d.currentVersion!==v.number)throw Error('This document version is no longer available.');
 if(['accepted','signed'].includes(v.status)){if(action==='decline')throw Error('A completed document cannot be declined.');return d;}
 if(v.status!=='published'||v.responseMode==='none')throw Error('This document does not accept a response.');
 if(action==='decline'){v.status=d.status='declined';documentActivity(s,d,'declined');return d;}
 if(!['accept','sign'].includes(action))throw Error('Invalid response.');
 if(v.responseMode==='signature'&&(action!=='sign'||!clean(signature.name)||!signature.consent))throw Error('Enter your full name and confirm the signature simulation.');
 if(v.responseMode==='acceptance'&&action!=='accept')throw Error('This document requires acceptance, not a signature.');
 // Complete against a copy so invoice validation cannot leave a half-completed agreement.
 const next=copy(s),nd=getDoc(next,id),nv=nd.versions.find(x=>x.number===v.number);
 if(pricingVisible(v)&&v.offers?.length){const q=quoteOffers(v.offers,signature.selections);Object.assign(nv,{selections:q.selections,agreedItems:q.items,budget:q.amount,pricingEstimated:q.estimated});if(v.billing)nv.billingPlan=allocatePlan(q.amount,v.billingPlan,v.phases);Object.assign(nd,{pricingEstimated:nv.pricingEstimated,budget:nv.budget,billingPlan:copy(nv.billingPlan),selections:q.selections,agreedItems:q.items});}
 if(v.billing){const p=next.projects.find(p=>p.id===v.projectId);if(!p||p.accepted||p.billingDocumentId!==id)throw Error('The project billing agreement has changed.');
  Object.assign(p,{budget:nv.budget,proposal:v.scope,deliverables:v.deliverables,phases:copy(v.phases),billingPlan:copy(nv.billingPlan),deposit:nv.billingPlan[0].percent,proposalStatus:'published',accepted:false,currentVersion:v.number,versions:[{...copy(nv),name:p.name,status:'published'}],needsPricing:false});
  acceptProposal(next,p.id,v.number);
 }
 nv.status=nd.status=v.responseMode==='signature'?'signed':'accepted';nv.completedAt=new Date().toISOString();nv.signature=v.responseMode==='signature'?{name:clean(signature.name),simulated:true}:null;nd.updatedAt=today();
 documentActivity(next,nd,v.responseMode==='signature'?'signed (demo)':'accepted');Object.assign(s,next);return getDoc(s,id);
}
export function archiveDocument(s,id){const d=getDoc(s,id);d.archived=!d.archived;return d;}
export function saveForm(s,data,id){
 const old=id?getForm(s,id):null;if(old?.status==='archived')throw Error('Restore the form before editing.');const temporary={};saveIntake(temporary,data);const config=temporary.intake;
 if(!clean(data.name||data.title))throw Error('Enter a form name.');if(data.questions!==undefined)config.questions=normalizeQuestions(data.questions);else if(old?.questions)config.questions=structuredClone(old.questions);if(clean(data.name||data.title).length>100||config.title.length>100||config.intro.length>2000)throw Error('Keep form names and titles under 100 characters and introductions under 2,000.');const clientId=data.clientId??old?.clientId??null,projectId=data.projectId??old?.projectId??null;if(clientId&&!s.clients.some(c=>c.id===clientId&&!c.archived))throw Error('Choose an active client.');if(projectId&&!s.projects.some(p=>p.id===projectId&&p.clientId===clientId&&!p.archived))throw Error('Choose an active project for this client.');const f={...old,...config,design:formDesign(data.design??old?.design),clientId,projectId,name:clean(data.name||data.title),id:old?.id||uid(),status:['draft','active'].includes(data.status)?data.status:old?.status||'active',createdAt:old?.createdAt||today()};if(old)Object.assign(old,f);else s.forms.unshift(f);return old||f;
}
export function toggleForm(s,id){const f=getForm(s,id);f.status=f.status==='active'?'archived':'active';return f;}
export function submitForm(s,id,data,key,context={}){
 const f=getForm(s,id);if(f.status!=='active')throw Error('This form is archived.');const scopedKey=`${id}:${key}`,prior=s.submissions.find(x=>x.key===scopedKey);if(prior)return s.projects.find(p=>p.id===prior.projectId)||prior;
 if(data.answers!==undefined||f.questions)return submitQuestionForm(s,f,data,key,context);
 const next=copy(s),previousIntake=next.intake;next.intake=copy(f);const p=submitInquiry(next,data,scopedKey);const submission=next.submissions.find(x=>x.key===scopedKey);Object.assign(submission,{formId:id,formTitle:f.title,scope:p.inquiry.scope,question:p.inquiry.question,answer:p.inquiry.answer,contactName:clean(data.contact),contactEmail:clean(data.email),clientName:clean(data.name)});next.intake=previousIntake;Object.assign(s,next);return s.projects.find(x=>x.id===p.id);
}

function submitQuestionForm(s,f,data,key,context={}){
 if(!key)throw Error('Submission identifier is required.');const checked=validateFormAnswers(f,data.answers),d=checked.mapped,next=copy(s);let c=null,p=null;
 if(context.clientId){c=next.clients.find(c=>c.id===context.clientId&&!c.archived);if(!c)throw Error('This client portal is unavailable.');if(d.email&&d.email.toLowerCase()!==c.email.toLowerCase())throw Error('Use the email address associated with this client portal.');}
 if(!c&&d.email){c=next.clients.find(c=>c.email.trim().toLowerCase()===d.email.trim().toLowerCase());if(c?.archived)throw Error('This contact is archived. Restore the client first.');if(!c)c=saveClient(next,{name:d.name||d.contact||d.email,contact:d.contact||d.name||d.email,email:d.email,tag:f.tag});}
 if(c&&d.project){p=createProject(next,{name:d.project,clientId:c.id,budget:d.budget||100,service:f.service,due:d.due||'',scope:d.scope||''});if(!d.budget){p.budget=0;p.billingPlan=[];p.needsPricing=true;}p.source='Inquiry form';p.inquiry={scope:d.scope||'',budget:d.budget??null,submittedAt:new Date().toISOString(),tag:f.tag};}
 const sub={id:uid(),key:`${f.id}:${key}`,formId:f.id,formTitle:f.title,clientId:c?.id||null,projectId:p?.id||null,clientName:d.name||c?.name||'',contactName:d.contact||c?.contact||'',contactEmail:d.email||'',scope:d.scope||'',answers:checked.snapshots,createdAt:new Date().toISOString()};if(context.clientId){sub.clientId=context.clientId;sub.portalAssignmentId=context.assignmentId;sub.contactEmail=c.email;sub.clientName=c.name;}next.submissions.unshift(sub);addActivity(next,'Form submitted',f.title,'forms');Object.assign(s,next);return p?s.projects.find(x=>x.id===p.id):s.submissions.find(x=>x.id===sub.id);
}
