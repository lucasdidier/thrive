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
export function allocatePlan(budget,rules,phases){
 if(!Number.isSafeInteger(budget)||budget<1)throw Error('Enter a project fee greater than zero.');
 if(!rules?.length||rules.length>9)throw Error('Add a deposit and up to eight milestone payments.');
 if(Math.abs(rules.reduce((a,r)=>a+Number(r.percent),0)-100)>0.00001)throw Error('Payment percentages must add up to 100%.');
 const ids=rules.map(r=>r.id).filter(Boolean);if(new Set(ids).size!==ids.length)throw Error('Each payment rule must have a unique identifier.');
 let total=0;const used=new Set();return rules.map((r,i)=>{
  const percent=Number(r.percent);if(!Number.isFinite(percent)||percent<=0||percent>100)throw Error('Each payment must be greater than 0% and at most 100%.');
  if(i===0&&r.phaseId)throw Error('The first payment must be the deposit.');
  if(i>0&&(!phases.some(f=>f.id===r.phaseId)||used.has(r.phaseId)))throw Error('Choose a different phase for each milestone payment.');used.add(r.phaseId);
  const amount=i===rules.length-1?budget-total:Math.round(budget*percent/100);total+=amount;if(amount<=0)throw Error('Each payment must be at least 0.01.');
  return{id:r.id||uid(),name:clean(r.name)||(i?'Milestone payment':'Deposit'),percent,phaseId:r.phaseId||null,amount};
 });
}
export function defaultPlan(budget,deposit,phases){const rest=100-deposit,targets=phases.slice(-2),half=Math.floor(rest*100/2)/100;return allocatePlan(budget,[{id:uid(),name:'Deposit',percent:deposit,phaseId:null},...targets.filter(()=>rest>0).map((f,i)=>({id:uid(),name:i===targets.length-1?'Final payment':'Milestone payment',percent:targets.length===1?rest:i===0?half:rest-half,phaseId:f.id}))],phases);}
function snapshot(s,p){return{number:p.versions.length+1,name:p.name,client:clone(projectClient(s,p)),business:s.settings.business,currency:p.currency||s.settings.currency||'USD',scope:p.proposal,deliverables:p.deliverables,budget:p.budget,due:p.due,phases:clone(p.phases),billingPlan:clone(p.billingPlan),createdAt:new Date().toISOString(),status:'published'};}
export function migrate(s){
 if(!s||![1,2].includes(s.version)||!Array.isArray(s.projects))return seed();if(s.version===2)return s;
 s.intake={title:'Project inquiry',intro:'Tell us about your project.',service:'Brand identity',tag:'Website inquiry',collectBudget:true,collectDate:true,question:'',questionRequired:false};s.submissions=[];
 s.clients.forEach(c=>c.archived??=false);
 for(const p of s.projects){p.archived??=false;p.phases.forEach((f,i)=>f.id??=`${p.id}-phase-${i}`);p.deliverables??='';p.proposalStatus=p.accepted?'accepted':'draft';p.versions=[];p.currentVersion=null;
  const bills=s.invoices.filter(i=>i.projectId===p.id);
  if(!bills.length)p.billingPlan=defaultPlan(p.budget,p.deposit,p.phases);
  else{p.billingPlan=bills.map((inv,i)=>{const r={id:`${inv.id}-rule`,name:inv.kind==='deposit'?'Deposit':inv.kind==='final'?'Final payment':'Milestone payment',percent:inv.amount/p.budget*100,amount:inv.amount,phaseId:inv.kind==='deposit'?null:p.phases[Math.min(i,p.phases.length-1)].id};inv.ruleId=r.id;return r;});const balance=p.budget-bills.reduce((a,i)=>a+i.amount,0);if(balance>0)p.billingPlan.push({id:`${p.id}-balance`,name:'Final payment',percent:balance/p.budget*100,amount:balance,phaseId:p.phases.at(-1).id});}
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
 const current=id?s.clients.find(c=>c.id===id):null;if(id&&!current)throw Error('Client not found.');const c={...current,id:id||uid(),name,contact,email,type,tag:clean(data.tag)||'',initials:name[0].toUpperCase(),color:current?.color||'sage',tags:tags??current?.tags??[],archived:current?.archived||false};for(const key of ['firstName','lastName','companyName']){if(data[key]!==undefined){c[key]=clean(data[key]);if(c[key].length>100)throw Error('Keep client names under 100 characters.');}}if(current)Object.assign(current,c);else s.clients.unshift(c);addActivity(s,id?'Client updated':'Client created',name,'client');return current||c;
}
export function archiveClient(s,id){const c=s.clients.find(c=>c.id===id);if(!c)throw Error('Client not found.');c.archived=!c.archived;addActivity(s,c.archived?'Client archived':'Client restored',c.name,'client');}
export function createProject(s,data){
 const name=clean(data.name),c=s.clients.find(c=>c.id===data.clientId);if(!name||!c||c.archived)throw Error('Choose an active client and enter a project name.');if(!validDate(data.due))throw Error('Enter a valid target date.');
 const phases=s.settings.phases.map(name=>({id:uid(),name,done:false})),billingPlan=defaultPlan(data.budget,s.settings.deposit,phases);
 const p={id:uid(),name,clientId:data.clientId,budget:data.budget,service:clean(data.service)||'Services',due:data.due||'',status:'inquiry',archived:false,deposit:s.settings.deposit,phases,billingPlan,accepted:false,proposal:clean(data.scope)||'Describe the scope of work.',deliverables:'',proposalStatus:'draft',versions:[],currentVersion:null};s.projects.unshift(p);addActivity(s,'Project created',p.name);return p;
}
function deliveryFunded(s,p){const bills=s.invoices.filter(i=>i.projectId===p.id&&i.kind!=='manual'),deposits=bills.filter(i=>i.kind==='deposit');return deposits.length?deposits.every(i=>i.paid>=i.amount):p.budget>0&&bills.reduce((a,i)=>a+i.paid,0)>=p.budget;}
export function updateProject(s,id,data){
 const p=get(s,id);openProject(p);const name=clean(data.name),service=clean(data.service),due=data.due||'',status=data.status||p.status;if(!name||!validDate(due))throw Error('Enter a project name and valid target date.');
 if(!['inquiry','proposal','awaiting deposit','active','completed','cancelled','declined'].includes(status))throw Error('Invalid project status.');
 if(['active','completed'].includes(status)&&(!p.accepted||!deliveryFunded(s,p)))throw Error('Accept the proposal and record its deposit before starting delivery.');
 if(status==='completed'&&!p.phases.every(f=>f.done))throw Error('Complete all delivery phases first.');
 if(p.accepted&&['inquiry','proposal','declined'].includes(status))throw Error('An accepted project cannot return to an inquiry or proposal.');
 if(!p.accepted&&status==='awaiting deposit')throw Error('Accept the proposal before awaiting a deposit.');
 if(status==='declined'&&p.proposalStatus!=='declined')throw Error('Decline the proposal from the client preview.');
 if(!p.accepted&&p.proposalStatus!=='draft'&&(name!==p.name||due!==p.due))throw Error('Create a proposal revision before changing its name or target date.');
 const clientId=data.clientId||p.clientId;if(clientId!==p.clientId){if(!s.clients.some(c=>c.id===clientId&&!c.archived))throw Error('Choose an active client.');if(p.accepted||p.versions?.length||['documents','invoices','invoiceDrafts','time','forms'].some(key=>s[key]?.some(r=>r.projectId===id))||s.scheduling?.meetings.some(m=>m.projectId===id))throw Error('This project has linked work. Keep its client to preserve those relationships.');}
 Object.assign(p,{name,service,due,status,clientId});addActivity(s,'Project updated',p.name);return p;
}
export function archiveProject(s,id){const p=get(s,id);p.archived=!p.archived;addActivity(s,p.archived?'Project archived':'Project restored',p.name);}
export function reopenProject(s,id){const p=get(s,id);if(p.status!=='cancelled')throw Error('This project is not cancelled.');p.status=p.accepted?(deliveryFunded(s,p)?(p.phases.every(f=>f.done)?'completed':'active'):'awaiting deposit'):'inquiry';}
export function saveProposal(s,id,data){
 const p=get(s,id);draftOnly(p);const scope=clean(data.scope);if(!scope)throw Error('Enter the scope of work.');const names=data.phases.map(clean).filter(Boolean);if(!names.length||names.length>8||new Set(names.map(n=>n.toLowerCase())).size!==names.length)throw Error('Enter one to eight unique phase names.');
 const phases=names.map((name,i)=>({id:p.phases[i]?.id||data.phaseIds?.[i]||uid(),name,done:p.phases[i]?.done||false}));const billingPlan=allocatePlan(data.budget,data.rules,phases);
 Object.assign(p,{proposal:scope,deliverables:clean(data.deliverables),budget:data.budget,phases,billingPlan,deposit:billingPlan[0].percent,status:'proposal',needsPricing:false});addActivity(s,'Proposal draft saved',p.name,'document');return p;
}
export function publishProposal(s,id){const p=get(s,id);draftOnly(p);if(!clean(p.proposal))throw Error('Add a scope of work.');allocatePlan(p.budget,p.billingPlan,p.phases);const v=snapshot(s,p);p.versions.push(v);p.currentVersion=v.number;p.proposalStatus='published';p.status='proposal';addActivity(s,'Proposal published for preview',`${p.name} · Version ${v.number}`,'document');return v;}
export function reviseProposal(s,id){const p=get(s,id);openProject(p);if(p.accepted)throw Error('Accepted proposals cannot be revised in this prototype.');if(p.proposalStatus==='draft')return;p.versions.forEach(v=>{if(v.status==='published')v.status='superseded';});p.proposalStatus='draft';p.currentVersion=null;p.status='proposal';}
function currentVersion(s,id,number){const p=get(s,id);openProject(p);const v=p.versions.find(v=>v.number===Number(number));if(!v||v.number!==p.currentVersion||!['published','accepted'].includes(v.status))throw Error('This proposal version is no longer available for acceptance.');return{p,v};}
export function acceptProposal(s,id,number){const {p,v}=currentVersion(s,id,number);if(p.accepted)return s.invoices.find(i=>i.projectId===id&&i.kind==='deposit');p.accepted=true;p.proposalStatus='accepted';v.status='accepted';p.acceptedAt=new Date().toISOString();p.acceptedProposal=v.scope;p.status='awaiting deposit';addActivity(s,'Proposal accepted',`${p.name} · Version ${v.number}`,'document');if(s.workflows.find(w=>w.id==='w1')?.enabled)return generateDeposit(s,id);}
export function declineProposal(s,id,number){const {p,v}=currentVersion(s,id,number);if(p.accepted)throw Error('An accepted proposal cannot be declined.');v.status='declined';p.proposalStatus='declined';p.status='declined';addActivity(s,'Proposal declined',p.name,'document');}
function issue(s,p,r){
 const existing=s.invoices.find(i=>i.projectId===p.id&&i.ruleId===r.id);if(existing)return existing;
 if(s.invoices.filter(i=>i.projectId===p.id&&i.kind!=='manual').reduce((a,i)=>a+i.amount,0)+r.amount>p.budget)throw Error('This invoice would exceed the agreed fee.');
 const v=p.versions.find(v=>v.number===p.currentVersion),c=v?.client||projectClient(s,p);
 const i={id:uid(),number:`INV-${String(Math.max(0,...s.invoices.map(i=>Number(i.number.split('-')[1])||0))+1).padStart(3,'0')}`,projectId:p.id,ruleId:r.id,amount:r.amount,paid:0,due:today(),kind:r.phaseId?'milestone':'deposit',label:r.name,clientName:c.name,clientEmail:c.email,projectName:v?.name||p.name,business:v?.business||s.settings.business,currency:v?.currency||p.currency||s.settings.currency||'USD',paymentInstructions:s.settings.paymentInstructions||'',payments:[],issued:today(),design:clone(s.settings.invoiceDesign||defaultInvoiceDesign())};s.invoices.unshift(i);addActivity(s,'Invoice created',`${p.name} · ${r.name} · ${money(i.amount,i.currency)}`,'document');return i;
}
export function generateDeposit(s,id){const p=get(s,id);openProject(p);if(!p.accepted)throw Error('Accept the proposal first.');const existing=s.invoices.find(i=>i.projectId===id&&i.kind==='deposit');if(existing)return existing;const r=p.billingPlan.find(r=>!r.phaseId);if(!r)throw Error('No deposit is scheduled.');return issue(s,p,r);}
export function approveMilestone(s,id,phaseId){
 const p=get(s,id);openProject(p);if(!p.accepted||!['active','completed'].includes(p.status))throw Error('Record the deposit before approving a milestone.');const f=p.phases.find(f=>f.id===phaseId);if(!f)throw Error('Phase not found.');const rules=p.billingPlan.filter(r=>r.phaseId===phaseId);
 const total=s.invoices.filter(i=>i.projectId===id&&i.kind!=='manual').reduce((a,i)=>a+i.amount,0),added=rules.filter(r=>!s.invoices.some(i=>i.projectId===id&&i.ruleId===r.id)).reduce((a,r)=>a+r.amount,0);if(total+added>p.budget)throw Error('The milestone would exceed the agreed fee.');
 const bills=rules.map(r=>issue(s,p,r));if(!f.approved){f.done=true;f.approved=true;f.approvedAt=new Date().toISOString();addActivity(s,'Milestone approved',`${p.name} · ${f.name}`);}if(p.phases.every(f=>f.done))p.status='completed';return bills;
}
export function togglePhase(s,id,phaseId){const p=get(s,id);openProject(p);if(!['active','completed'].includes(p.status))throw Error('Record the deposit before starting delivery.');const f=p.phases.find(f=>f.id===phaseId);if(!f)throw Error('Phase not found.');if(p.billingPlan.some(r=>r.phaseId===phaseId))throw Error('Use milestone approval for phases linked to a payment.');f.done=!f.done;p.status=p.phases.every(f=>f.done)?'completed':'active';}
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
 if(i.paid===i.amount&&i.kind==='deposit'&&p?.status==='awaiting deposit')p.status='active';
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
export function suggestSetup(text){const match=text.match(/(\d{1,3})\s*%/),deposit=match?Number(match[1]):50;if(deposit<1||deposit>100)throw Error('The deposit must be between 1% and 100%.');const web=/web|develop/i.test(text),consult=/consult|strateg/i.test(text);return{deposit,phases:web?['Discovery','Design','Development','Launch']:consult?['Discovery','Strategy','Recommendations']:['Discovery','Design','Handoff'],service:web?'Web design':consult?'Consulting':'Brand identity',review:true,description:text,unsupported:/hourly|recurr|monthly|stripe|bank|email integration/i.test(text)};}
