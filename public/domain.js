import {normalizedProjectStatus,projectStatuses} from './project-status.js';
import {formatMoney as money} from './currency.js';
import {defaultInvoiceDesign} from './invoice-design.js';
import {baseSeed} from './seed.js';
export const uid=()=>globalThis.crypto.randomUUID();
export const today=()=>new Date().toISOString().slice(0,10);
export {formatMoney as money} from './currency.js';
export const projectClient=(s,p)=>s.clients.find(c=>c.id===p?.clientId);
export const invoiceStatus=i=>i.paid>=i.amount?'paid':i.due<today()?'overdue':'outstanding';
const clean=x=>String(x??'').trim(), clone=x=>JSON.parse(JSON.stringify(x));
const get=(s,id)=>{const p=s.projects.find(p=>p.id===id);if(!p)throw Error('Project not found.');return p;};
const openProject=p=>{if(p.archived||p.status==='cancelled')throw Error('Restore or reopen the project first.');};
const draftOnly=p=>{openProject(p);if(p.accepted)throw Error('Accepted commercial terms cannot be changed.');if(p.proposalStatus!=='draft')throw Error('Create a revision before editing published terms.');};
const validDate=d=>!d||(/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(new Date(d))&&new Date(d).toISOString().slice(0,10)===d);
export function addActivity(s,text,detail,kind='project',metadata={}){s.activity.unshift({...metadata,id:uid(),text,detail,kind,createdAt:new Date().toISOString(),time:'Just now'});}
export function totals(s){return{paid:s.invoices.reduce((a,i)=>a+i.paid,0),outstanding:s.invoices.reduce((a,i)=>a+i.amount-i.paid,0),hours:s.time.filter(t=>!t.archived).reduce((a,t)=>a+t.hours,0),active:s.projects.filter(p=>!p.archived&&p.status==='active').length};}
export function allocatePlan(budget,rules){
 if(!Number.isSafeInteger(budget)||budget<1)throw Error('Enter a project fee greater than zero.');
 if(!Array.isArray(rules)||!rules.length||rules.length>9)throw Error('Add between one and nine payments.');
 if(Math.abs(rules.reduce((a,r)=>a+Number(r.percent),0)-100)>.00001)throw Error('Payment percentages must add up to 100%.');
 let total=0;const ids=new Set();return rules.map((r,i)=>{const percent=Number(r.percent),id=r.id||uid();
 if(ids.has(id))throw Error('Each payment needs a unique identifier.');ids.add(id);
 if(!Number.isFinite(percent)||percent<=0||percent>100)throw Error('Each payment must be greater than 0% and at most 100%.');
 const amount=i===rules.length-1?budget-total:Math.round(budget*percent/100);total+=amount;if(amount<1)throw Error('Each payment must be at least 0.01.');
 return {id,name:clean(r.name)||(i?'Payment':'Deposit'),percent,amount,trigger:i===0?'acceptance':'manual'};});
}
export function defaultPlan(budget,deposit){return allocatePlan(budget,[{name:'Deposit',percent:deposit},...(deposit<100?[{name:'Final payment',percent:100-deposit}]:[])]);}
function snapshot(s,p){return{number:p.versions.length+1,name:p.name,client:clone(projectClient(s,p)),business:s.settings.business,currency:p.budgetCurrency||p.currency||s.settings.currency||'USD',scope:p.proposal,deliverables:p.deliverables,budget:p.budget,due:p.due,billingPlan:clone(p.billingPlan),createdAt:new Date().toISOString(),status:'published'};}
export function migrate(s){
 if(!s||![1,2].includes(s.version)||!Array.isArray(s.projects))return seed();if(s.version===2)return s;
 s.intake={title:'Project inquiry',intro:'Tell us about your project.',service:'Brand identity',tag:'Website inquiry',collectBudget:true,collectDate:true,question:'',questionRequired:false};s.submissions=[];
 s.clients.forEach(c=>c.archived??=false);
 for(const p of s.projects){p.archived??=false;p.deliverables??='';p.proposalStatus=p.accepted?'accepted':'draft';p.versions=[];p.currentVersion=null;
  const bills=s.invoices.filter(i=>i.projectId===p.id);
  if(!bills.length)p.billingPlan=defaultPlan(p.budget,p.deposit);
  else{p.billingPlan=bills.map((inv,i)=>{const r={id:`${inv.id}-rule`,name:inv.kind==='deposit'?'Deposit':inv.kind==='final'?'Final payment':'Milestone payment',percent:inv.amount/p.budget*100,amount:inv.amount,trigger:inv.kind==='deposit'?'acceptance':'manual'};inv.ruleId=r.id;return r;});const balance=p.budget-bills.reduce((a,i)=>a+i.amount,0);if(balance>0)p.billingPlan.push({id:`${p.id}-balance`,name:'Final payment',percent:balance/p.budget*100,amount:balance,trigger:'manual'});}
  if(p.accepted){const v=snapshot(s,p);v.status='accepted';v.scope=p.acceptedProposal||p.proposal;p.versions.push(v);p.currentVersion=v.number;}
  bills.forEach(i=>{const c=projectClient(s,p);i.clientName??=c.name;i.clientEmail??=c.email;i.projectName??=p.name;i.business??=s.settings.business;});
 }
 const labels={w1:'Deposit invoicing',w2:'Post-meeting follow-up'};s.workflows.forEach(w=>{if(labels[w.id])w.name=labels[w.id];});s.version=2;return s;
}
export function seed(){return migrate(baseSeed());}
export function saveClient(s,data,id){
 const currentType=s.clients.find(c=>c.id===id)?.type||'company',type=data.type??currentType;if(!['company','individual'].includes(type))throw Error('Choose company or individual.');const name=clean(data.name),contact=type==='individual'?name:clean(data.contact),email=clean(data.email).toLowerCase();if(!name||(type==='company'&&!contact)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a client name, contact name, and valid email.');
 if(s.clients.some(c=>c.id!==id&&c.email.toLowerCase()===email))throw Error('A client with this email already exists.');
 const tags=data.tags===undefined?null:[...new Set((Array.isArray(data.tags)?data.tags:String(data.tags).split(',')).map(clean).filter(Boolean))];if(tags&&(tags.length>20||tags.some(t=>t.length>60)))throw Error('Use up to 20 tags, with at most 60 characters each.');
 const current=id?s.clients.find(c=>c.id===id):null;if(id&&!current)throw Error('Client not found.');const c={...current,id:id||uid(),name,contact,email,type,tag:clean(data.tag)||'',initials:name[0].toUpperCase(),color:current?.color||'sage',tags:tags??current?.tags??[],archived:current?.archived||false};for(const key of ['firstName','lastName','companyName']){if(data[key]!==undefined){c[key]=clean(data[key]);if(c[key].length>100)throw Error('Keep client names under 100 characters.');}}if(current)Object.assign(current,c);else s.clients.unshift(c);addActivity(s,id?'Client updated':'Client created',name,'client',{clientId:c.id});return current||c;
}
export function archiveClient(s,id){const c=s.clients.find(c=>c.id===id);if(!c)throw Error('Client not found.');c.archived=!c.archived;addActivity(s,c.archived?'Client archived':'Client restored',c.name,'client',{clientId:c.id});}
export function createProject(s,data){
 const name=clean(data.name),c=s.clients.find(c=>c.id===data.clientId);if(!name||!c||c.archived)throw Error('Choose an active client and enter a project name.');if(!validDate(data.due))throw Error('Enter a valid target date.');
 const billingPlan=defaultPlan(data.budget,s.settings.deposit);
 const p={id:uid(),name,currency:data.currency||c.currency||s.settings.currency||'USD',clientId:data.clientId,budget:data.budget,service:clean(data.service)||s.settings.service||'Services',due:data.due||'',status:'planned',archived:false,deposit:s.settings.deposit,billingPlan,accepted:false,proposal:clean(data.scope)||'Describe the scope of work.',deliverables:'',proposalStatus:'draft',versions:[],currentVersion:null};s.projects.unshift(p);addActivity(s,'Project created',p.name,'project',{projectId:p.id});return p;
}
function deliveryFunded(s,p){const bills=s.invoices.filter(i=>i.projectId===p.id&&i.kind!=='manual'),deposits=bills.filter(i=>i.kind==='deposit');return deposits.length?deposits.every(i=>i.paid>=i.amount):p.budget>0&&bills.reduce((a,i)=>a+i.paid,0)>=p.budget;}
export function updateProject(s,id,data){
 const p=get(s,id);if(p.archived)throw Error('Restore the project first.');const name=clean(data.name),service=clean(data.service),due=data.due||'',status=data.status||p.status;if(!name||!validDate(due))throw Error('Enter a project name and valid target date.');
 if(!projectStatuses(s).some(x=>x.id===normalizedProjectStatus(status)))throw Error('Choose a project status from workspace settings.');
 const clientId=data.clientId||p.clientId;if(clientId!==p.clientId){if(!s.clients.some(c=>c.id===clientId&&!c.archived))throw Error('Choose an active client.');if(p.accepted||p.versions?.length||['documents','invoices','invoiceDrafts','time','forms'].some(key=>s[key]?.some(r=>r.projectId===id))||s.scheduling?.meetings.some(m=>m.projectId===id))throw Error('This project has linked work. Keep its client to preserve those relationships.');}
 if(normalizedProjectStatus(status)!==normalizedProjectStatus(p.status))p.completedAt=normalizedProjectStatus(status)==='completed'?new Date().toISOString():null;
 Object.assign(p,{name,service,due,status:normalizedProjectStatus(status),clientId});addActivity(s,'Project updated',p.name,'project',{projectId:p.id});return p;
}
export function archiveProject(s,id){const p=get(s,id);p.archived=!p.archived;addActivity(s,p.archived?'Project archived':'Project restored',p.name,'project',{projectId:p.id});}
export function reopenProject(s,id){const p=get(s,id);if(p.status!=='cancelled')throw Error('This project is not cancelled.');p.status='planned';}
export function saveProposal(s,id,data){
 const p=get(s,id);draftOnly(p);const scope=clean(data.scope);if(!scope)throw Error('Enter the scope of work.');const billingPlan=allocatePlan(data.budget,data.rules);
 Object.assign(p,{proposal:scope,deliverables:clean(data.deliverables),budget:data.budget,billingPlan,deposit:billingPlan[0].percent,status:'planned',needsPricing:false});addActivity(s,'Proposal draft saved',p.name,'document');return p;
}
export function publishProposal(s,id){const p=get(s,id);draftOnly(p);if(!clean(p.proposal))throw Error('Add a scope of work.');allocatePlan(p.budget,p.billingPlan);const v=snapshot(s,p);p.versions.push(v);p.currentVersion=v.number;p.proposalStatus='published';addActivity(s,'Proposal published for preview',`${p.name} · Version ${v.number}`,'document');return v;}
export function reviseProposal(s,id){const p=get(s,id);openProject(p);if(p.accepted)throw Error('Accepted proposals cannot be revised in this prototype.');if(p.proposalStatus==='draft')return;p.versions.forEach(v=>{if(v.status==='published')v.status='superseded';});p.proposalStatus='draft';p.currentVersion=null;}
function currentVersion(s,id,number){const p=get(s,id);openProject(p);const v=p.versions.find(v=>v.number===Number(number));if(!v||v.number!==p.currentVersion||!['published','accepted'].includes(v.status))throw Error('This proposal version is no longer available for acceptance.');return{p,v};}
export function acceptProposal(s,id,number){const {p,v}=currentVersion(s,id,number);if(p.accepted)return s.invoices.find(i=>i.projectId===id&&i.kind==='deposit');p.accepted=true;p.proposalStatus='accepted';v.status='accepted';p.acceptedAt=new Date().toISOString();p.acceptedProposal=v.scope;addActivity(s,'Proposal accepted',`${p.name} · Version ${v.number}`,'document');if(s.workflows.find(w=>w.id==='w1')?.enabled)return generateDeposit(s,id);}
export function declineProposal(s,id,number){const {p,v}=currentVersion(s,id,number);if(p.accepted)throw Error('An accepted proposal cannot be declined.');v.status='declined';p.proposalStatus='declined';addActivity(s,'Proposal declined',p.name,'document');}
function issue(s,p,r){
 const existing=s.invoices.find(i=>i.projectId===p.id&&i.ruleId===r.id);if(existing)return existing;
 if(s.invoices.filter(i=>i.projectId===p.id&&i.kind!=='manual').reduce((a,i)=>a+i.amount,0)+r.amount>p.budget)throw Error('This invoice would exceed the agreed fee.');
 const v=p.versions.find(v=>v.number===p.currentVersion),c=v?.client||projectClient(s,p);
 const i={id:uid(),number:`INV-${String(Math.max(0,...s.invoices.map(i=>Number(i.number.split('-')[1])||0))+1).padStart(3,'0')}`,projectId:p.id,ruleId:r.id,amount:r.amount,paid:0,due:today(),kind:r.trigger==='manual'?'milestone':'deposit',label:r.name,clientName:c.name,clientEmail:c.email,projectName:v?.name||p.name,business:v?.business||s.settings.business,currency:v?.currency||p.currency||s.settings.currency||'USD',paymentInstructions:s.settings.paymentInstructions||'',payments:[],issued:today(),design:clone(s.settings.invoiceDesign||defaultInvoiceDesign())};s.invoices.unshift(i);addActivity(s,'Invoice created',`${p.name} · ${r.name} · ${money(i.amount,i.currency)}`,'document');return i;
}
export function generateDeposit(s,id){const p=get(s,id);openProject(p);if(!p.accepted)throw Error('Accept the proposal first.');const existing=s.invoices.find(i=>i.projectId===id&&i.kind==='deposit');if(existing)return existing;const r=p.billingPlan.find(r=>r.trigger!=='manual');if(!r)throw Error('No deposit is scheduled.');return issue(s,p,r);}
export function issueScheduledPayment(s,id,ruleId){
 const p=get(s,id);openProject(p);if(!p.accepted)throw Error('The client must accept the billing agreement first.');
 const r=p.billingPlan.find(r=>r.id===ruleId);if(!r)throw Error('Payment not found.');return issue(s,p,r);
}
export function initBilling(s){
 s.invoiceDrafts??=[];s.services??=[];
 s.settings.paymentInstructions??='';s.settings.invoiceDesign??=defaultInvoiceDesign();
 for(const i of s.invoices){i.clientId??=s.projects.find(p=>p.id===i.projectId)?.clientId||null;i.design??=defaultInvoiceDesign();i.paymentInstructions??='';i.payments??=i.paid>0?[{id:`legacy-${i.id}`,amount:i.paid,date:i.paidAt||null,method:'Previously recorded',reference:'',legacy:true}]:[];}
 return s;
}
export function savePaymentInstructions(s,text,invoiceId){
 text=clean(text);if(text.length>3000)throw Error('Payment instructions must be 3,000 characters or fewer.');
 const i=invoiceId?s.invoices.find(i=>i.id===invoiceId):null;if(invoiceId&&!i)throw Error('Invoice not found.');
 if(i)i.paymentInstructions=text;else s.settings.paymentInstructions=text;
 addActivity(s,invoiceId?'Invoice payment instructions updated':'Default payment instructions updated',invoiceId?i.number:'Applies to new invoices','document');return text;
}
export function recordManualPayment(s,id,data,key){
 const i=s.invoices.find(i=>i.id===id);if(!i)throw Error('Invoice not found.');
 if(!key)throw Error('Payment identifier is required.');if(i.payments?.some(p=>p.id===key))return false;
 const amount=Number(data.amount),date=data.date,method=clean(data.method),reference=clean(data.reference);
 if(!Number.isSafeInteger(amount)||amount<1||amount>i.amount-i.paid)throw Error('Enter an amount greater than zero and no more than the invoice balance.');
 if(!date||!validDate(date)||date>today())throw Error('Enter a valid payment date on or before today.');
 if(!['Bank transfer','Cash','Check','Other'].includes(method))throw Error('Choose how the payment was received.');if(reference.length>200)throw Error('Keep the reference under 200 characters.');
 const p=i.projectId?get(s,i.projectId):null;initBilling(s);
 i.payments.push({id:key,amount,date,method,reference,recordedAt:new Date().toISOString()});i.paid+=amount;i.paidAt=i.payments.map(p=>p.date).filter(Boolean).sort().at(-1)||date;

 addActivity(s,i.paid>=i.amount?'Invoice paid':'Payment recorded',`${i.clientName||projectClient(s,p).name} · ${money(amount,i.currency||s.settings.currency||'USD')} · ${method}`,'payment');return true;
}
export function recordPayment(s,id){const i=s.invoices.find(i=>i.id===id);if(!i)throw Error('Invoice not found.');if(i.paid>=i.amount)return false;return recordManualPayment(s,id,{amount:i.amount-i.paid,date:today(),method:'Other',reference:''},`full-payment-${id}`);}

export function saveIntake(s,d){if(!clean(d.title))throw Error('Enter a form title.');s.intake={title:clean(d.title),intro:clean(d.intro),service:clean(d.service)||'Services',tag:clean(d.tag)||'Inquiry',collectBudget:!!d.collectBudget,collectDate:!!d.collectDate,question:clean(d.question),questionRequired:!!d.questionRequired};}
export function submitInquiry(s,d,key){
 if(!key)throw Error('Submission identifier is required.');const existing=s.submissions.find(x=>x.key===key);if(existing)return get(s,existing.projectId);
 if(!clean(d.project)||!clean(d.scope))throw Error('Enter a project name and scope.');if(s.intake.collectDate&&!validDate(d.due))throw Error('Enter a valid target date.');if(s.intake.question&&s.intake.questionRequired&&!clean(d.answer))throw Error('Answer the additional question.');
 const budget=s.intake.collectBudget&&d.budget!==''&&d.budget!=null?Number(d.budget):null;if(budget!==null&&(!Number.isSafeInteger(budget)||budget<=0))throw Error('Enter a positive estimated budget.');
 const draft=clone(s);let c=draft.clients.find(c=>c.email.toLowerCase()===clean(d.email).toLowerCase());if(c?.archived)throw Error('This contact is archived. Restore the client first.');if(!clean(d.contact)||!clean(d.name)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(d.email)))throw Error('Enter valid contact details.');if(!c)c=saveClient(draft,{name:d.name,contact:d.contact,email:d.email,tag:draft.intake.tag});
 const p=createProject(draft,{name:d.project,clientId:c.id,budget:budget||100,service:draft.intake.service,due:draft.intake.collectDate?d.due:'',scope:d.scope});if(budget===null){p.budget=0;p.billingPlan=[];p.needsPricing=true;}
 p.source='Inquiry form';p.inquiry={scope:clean(d.scope),budget,question:draft.intake.question,answer:clean(d.answer),submittedAt:new Date().toISOString(),tag:draft.intake.tag};draft.submissions.unshift({id:uid(),key,projectId:p.id,clientId:c.id,createdAt:new Date().toISOString()});addActivity(draft,'Inquiry received',p.name,'client');Object.assign(s,draft);return get(s,p.id);
}
export function suggestSetup(text){const match=text.match(/(\d{1,3})\s*%/),deposit=match?Number(match[1]):50;if(deposit<1||deposit>100)throw Error('The deposit must be between 1% and 100%.');const web=/web|develop/i.test(text),consult=/consult|strateg/i.test(text);return{deposit,service:web?'Web design':consult?'Consulting':'Brand identity',review:true,description:text,unsupported:/hourly|recurr|monthly|stripe|bank|email integration/i.test(text)};}
