import {uid,today,addActivity,allocatePlan,defaultPlan,acceptProposal,submitInquiry,saveIntake} from './domain.js';
const copy=x=>JSON.parse(JSON.stringify(x)), clean=x=>String(x??'').trim();
export const responseLabels={acceptance:'Acceptance',signature:'Signature',none:'No response'};
export const kindLabels={proposal:'Proposal',contract:'Contract',agreement:'Proposal + contract',document:'Document'};
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
 const kind=data.kind||'proposal';if(!kindLabels[kind])throw Error('Choose a document type.');
 const phases=copy(p?.phases||s.settings.phases.map(name=>({id:uid(),name,done:false}))),budget=p?.budget||0;
 const d={id:uid(),title:clean(data.title)||`${client.name} ${kind==='agreement'?'agreement':kindLabels[kind].toLowerCase()}`,kind,responseMode:kind==='contract'||kind==='agreement'?'signature':kind==='document'?'none':'acceptance',clientId:client.id,projectId:p?.id||null,billing:!!p&&!p.billingDocumentId&&kind!=='document',budget,phases,billingPlan:copy(p?.billingPlan||[]),scope:p?.proposal||'',deliverables:'',terms:'',due:p?.due||'',status:'draft',archived:false,currentVersion:null,versions:[],createdAt:today(),updatedAt:today()};
 if(d.billing){p.billingDocumentId=d.id;if(budget&&!d.billingPlan.length)d.billingPlan=defaultPlan(budget,s.settings.deposit,phases);}
 s.documents.unshift(d);addActivity(s,'Document created',d.title,'document');return d;
}
export function saveDocument(s,id,data){
 const d=getDoc(s,id);ensureOpen(s,d);if(d.status!=='draft')throw Error('Create a revision before editing this document.');
 const title=clean(data.title),scope=clean(data.scope),kind=data.kind||d.kind,responseMode=data.responseMode||d.responseMode;
 if(!title||!scope)throw Error('Enter a document title and content.');if(!kindLabels[kind]||!responseLabels[responseMode])throw Error('Choose a valid type and response requirement.');
 const billing=!!data.billing,p=s.projects.find(p=>p.id===d.projectId);let phases=copy(d.phases),billingPlan=copy(d.billingPlan),budget=d.budget;
 if(billing){
  if(!p)throw Error('Link a project before enabling billing.');if(responseMode==='none')throw Error('Billing requires acceptance or signature. Turn off billing for an information-only document.');
  if(p.accepted||s.documents.some(x=>x.id!==id&&x.projectId===p.id&&x.billing))throw Error('This project already has a billing agreement.');
  const names=(data.phases||d.phases.map(f=>f.name)).map(clean);if(!names.length||names.length>8||names.some(x=>!x)||new Set(names.map(x=>x.toLowerCase())).size!==names.length)throw Error('Enter one to eight unique delivery phases.');
  phases=names.map((name,i)=>({id:data.phaseIds?.[i]||d.phases[i]?.id||uid(),name,done:false}));budget=Number(data.budget);billingPlan=allocatePlan(budget,data.rules||d.billingPlan,phases);
 }
 Object.assign(d,{title,scope,kind,responseMode,billing,phases,billingPlan,budget,deliverables:clean(data.deliverables),terms:clean(data.terms),updatedAt:today()});
 if(p){if(billing)p.billingDocumentId=id;else if(p.billingDocumentId===id)delete p.billingDocumentId;}
 addActivity(s,'Document draft saved',d.title,'document');return d;
}
export function publishDocument(s,id){
 const d=getDoc(s,id);ensureOpen(s,d);if(d.status!=='draft')throw Error('Only a draft can be published.');if(!d.title||!clean(d.scope))throw Error('Add document content first.');
 if(d.billing){if(d.responseMode==='none')throw Error('Billing requires a response.');allocatePlan(d.budget,d.billingPlan,d.phases);}
 const v={...copy(d),versions:undefined,number:d.versions.length+1,client:copy(s.clients.find(c=>c.id===d.clientId)),business:s.settings.business,status:'published',createdAt:new Date().toISOString()};
 d.versions.push(v);d.currentVersion=v.number;d.status='published';d.updatedAt=today();addActivity(s,'Document published for preview',d.title,'document');return v;
}
export function reviseDocument(s,id){const d=getDoc(s,id);ensureOpen(s,d);if(['accepted','signed'].includes(d.status))throw Error('Completed agreements cannot be revised in this prototype.');if(d.status==='draft')return d;d.versions.forEach(v=>{if(v.status==='published')v.status='superseded';});d.status='draft';d.currentVersion=null;return d;}
export function respondDocument(s,id,number,action,signature={}){
 const d=getDoc(s,id);ensureOpen(s,d);const v=d.versions.find(v=>v.number===Number(number));if(!v||d.currentVersion!==v.number)throw Error('This document version is no longer available.');
 if(['accepted','signed'].includes(v.status)){if(action==='decline')throw Error('A completed document cannot be declined.');return d;}
 if(v.status!=='published'||v.responseMode==='none')throw Error('This document does not accept a response.');
 if(action==='decline'){v.status=d.status='declined';addActivity(s,'Document declined',d.title,'document');return d;}
 if(!['accept','sign'].includes(action))throw Error('Invalid response.');
 if(v.responseMode==='signature'&&(action!=='sign'||!clean(signature.name)||!signature.consent))throw Error('Enter your full name and confirm the signature simulation.');
 if(v.responseMode==='acceptance'&&action!=='accept')throw Error('This document requires acceptance, not a signature.');
 // Complete against a copy so invoice validation cannot leave a half-completed agreement.
 const next=copy(s),nd=getDoc(next,id),nv=nd.versions.find(x=>x.number===v.number);
 if(v.billing){const p=next.projects.find(p=>p.id===v.projectId);if(!p||p.accepted||p.billingDocumentId!==id)throw Error('The project billing agreement has changed.');
  Object.assign(p,{budget:v.budget,proposal:v.scope,deliverables:v.deliverables,phases:copy(v.phases),billingPlan:copy(v.billingPlan),deposit:v.billingPlan[0].percent,proposalStatus:'published',accepted:false,currentVersion:v.number,versions:[{...copy(v),name:p.name,status:'published'}],needsPricing:false});
  acceptProposal(next,p.id,v.number);
 }
 nv.status=nd.status=v.responseMode==='signature'?'signed':'accepted';nv.completedAt=new Date().toISOString();nv.signature=v.responseMode==='signature'?{name:clean(signature.name),simulated:true}:null;nd.updatedAt=today();
 addActivity(next,v.responseMode==='signature'?'Document signed (demo)':'Document accepted',nd.title,'document');Object.assign(s,next);return getDoc(s,id);
}
export function archiveDocument(s,id){const d=getDoc(s,id);d.archived=!d.archived;return d;}
export function saveForm(s,data,id){
 const old=id?getForm(s,id):null;if(old?.status==='archived')throw Error('Restore the form before editing.');const temporary={};saveIntake(temporary,data);const config=temporary.intake;
 if(!clean(data.name||data.title))throw Error('Enter a form name.');const f={...old,...config,name:clean(data.name||data.title),id:old?.id||uid(),status:old?.status||'active',createdAt:old?.createdAt||today()};if(old)Object.assign(old,f);else s.forms.unshift(f);return old||f;
}
export function toggleForm(s,id){const f=getForm(s,id);f.status=f.status==='active'?'archived':'active';return f;}
export function submitForm(s,id,data,key){
 const f=getForm(s,id);if(f.status!=='active')throw Error('This form is archived.');const scopedKey=`${id}:${key}`,prior=s.submissions.find(x=>x.key===scopedKey);if(prior)return s.projects.find(p=>p.id===prior.projectId);
 const next=copy(s),previousIntake=next.intake;next.intake=copy(f);const p=submitInquiry(next,data,scopedKey);const submission=next.submissions.find(x=>x.key===scopedKey);Object.assign(submission,{formId:id,formTitle:f.title,scope:p.inquiry.scope,question:p.inquiry.question,answer:p.inquiry.answer,contactName:clean(data.contact),contactEmail:clean(data.email),clientName:clean(data.name)});next.intake=previousIntake;Object.assign(s,next);return s.projects.find(x=>x.id===p.id);
}
