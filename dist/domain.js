export const uid = () => globalThis.crypto.randomUUID();
export const money = cents => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(cents / 100);
export const today = () => new Date().toISOString().slice(0,10);
export function seed() {
  return {
    version:1, settings:{name:'Alex Morgan',business:'Morgan Studio',deposit:50,phases:['Discovery','Design','Handoff'],review:true,description:'I’m a brand designer. I take 50% upfront, work in three phases, and review every proposal before sending it.'},
    clients:[
      {id:'c1',name:'Juniper Studio',contact:'Sophie Chen',email:'sophie@juniper.example',color:'sage',initials:'J',tag:'Branding'},
      {id:'c2',name:'Orbit',contact:'James Wilson',email:'james@orbit.example',color:'violet',initials:'O',tag:'Web design'},
      {id:'c3',name:'Forma',contact:'Emma Davis',email:'emma@forma.example',color:'sand',initials:'F',tag:'Editorial'},
      {id:'c4',name:'Paper & Pine',contact:'Oliver Reed',email:'oliver@paperpine.example',color:'rose',initials:'P',tag:'Branding'},
      {id:'c5',name:'Sunday Goods',contact:'Mia Taylor',email:'mia@sunday.example',color:'blue',initials:'S',tag:'Strategy'}
    ],
    projects:[
      {id:'p1',clientId:'c1',name:'A fresh identity for Juniper',service:'Brand identity',budget:600000,status:'active',deposit:50,phases:[{name:'Discovery',done:true},{name:'Design',done:false},{name:'Handoff',done:false}],due:'2026-10-28',proposal:'A thoughtful visual identity for Juniper Studio. Includes creative direction, a primary logo and supporting marks, a color palette, typography, and a concise brand guide.',accepted:true},
      {id:'p2',clientId:'c2',name:'Orbit website',service:'Web design',budget:650000,status:'active',deposit:50,phases:[{name:'Discovery',done:true},{name:'Design',done:true},{name:'Handoff',done:false}],due:'2026-10-24',proposal:'A clear, responsive website that brings Orbit’s product to life.',accepted:true},
      {id:'p3',clientId:'c3',name:'The autumn edition',service:'Editorial design',budget:200000,status:'completed',deposit:50,phases:[{name:'Discovery',done:true},{name:'Design',done:true},{name:'Handoff',done:true}],due:'2026-10-10',proposal:'Editorial design and production-ready artwork.',accepted:true},
      {id:'p4',clientId:'c4',name:'Paper & Pine brand refresh',service:'Brand identity',budget:400000,status:'proposal',deposit:50,phases:[{name:'Discovery',done:false},{name:'Design',done:false},{name:'Handoff',done:false}],due:'2026-11-14',proposal:'A warm, considered identity for Paper & Pine’s next chapter. We’ll develop a creative direction, refine your logo, create a flexible color and type system, and bring everything together in a practical brand guide.',accepted:false},
      {id:'p5',clientId:'c5',name:'Sunday’s next chapter',service:'Brand strategy',budget:250000,status:'inquiry',deposit:50,phases:[{name:'Discovery',done:false},{name:'Design',done:false},{name:'Handoff',done:false}],due:'2026-11-20',proposal:'A focused strategy engagement to clarify your positioning, audience, and brand story.',accepted:false}
    ],
    invoices:[
      {id:'i1',number:'INV-001',projectId:'p1',amount:300000,paid:300000,due:'2026-10-02',paidAt:'2026-10-02',kind:'deposit'},
      {id:'i2',number:'INV-002',projectId:'p2',amount:325000,paid:325000,due:'2026-10-04',paidAt:'2026-10-04',kind:'deposit'},
      {id:'i3',number:'INV-003',projectId:'p3',amount:200000,paid:200000,due:'2026-10-08',paidAt:'2026-10-08',kind:'final'},
      {id:'i4',number:'INV-004',projectId:'p1',amount:180000,paid:0,due:'2026-10-15',kind:'milestone'},
      {id:'i5',number:'INV-005',projectId:'p2',amount:300000,paid:0,due:'2026-10-24',kind:'milestone'}
    ],
    time:[{id:'t1',projectId:'p1',hours:18.5,note:'Creative direction and identity exploration',date:'2026-10-16'},{id:'t2',projectId:'p2',hours:14,note:'Design and development',date:'2026-10-16'}],
    workflows:[{id:'w1',name:'From a yes to a new beginning',description:'Agreement accepted → deposit invoice → project ready',enabled:true},{id:'w2',name:'A thoughtful follow-up',description:'Meeting completed → proposal & email drafts',enabled:false}],
    activity:[{id:'a1',text:'Juniper Studio paid the deposit',detail:'Brand identity · $3,000',time:'Oct 2',kind:'payment'},{id:'a2',text:'Paper & Pine proposal is ready',detail:'Brand identity · Waiting for your review',time:'Oct 16',kind:'document'},{id:'a3',text:'A new inquiry from Sunday Goods',detail:'Brand strategy · Website form',time:'Oct 17',kind:'client'}]
  };
}
export const projectClient = (s,p) => s.clients.find(c=>c.id===p.clientId);
export const invoiceStatus = i => i.paid >= i.amount ? 'paid' : i.due < today() ? 'overdue' : 'outstanding';
export function totals(s) {
  return {paid:s.invoices.reduce((a,i)=>a+i.paid,0),outstanding:s.invoices.reduce((a,i)=>a+i.amount-i.paid,0),hours:s.time.reduce((a,t)=>a+t.hours,0),active:s.projects.filter(p=>p.status==='active').length};
}
export function addActivity(s,text,detail,kind='project') { s.activity.unshift({id:uid(),text,detail,kind,time:'Just now'}); }
export function createProject(s,{name,clientId,budget,service,due}) {
  if (!name.trim() || !s.clients.some(c=>c.id===clientId)) throw new Error('Choose a client and enter a project name.');
  if (!Number.isSafeInteger(budget) || budget<=0) throw new Error('Enter a project fee greater than zero.');
  const p={id:uid(),name:name.trim(),clientId,budget,service:service.trim()||'Creative services',due,status:'inquiry',deposit:s.settings.deposit,phases:s.settings.phases.map(name=>({name,done:false})),accepted:false,proposal:'Describe the scope, deliverables, and timeline for this project.'};
  s.projects.unshift(p); addActivity(s,'A new project is taking shape',p.name); return p;
}
export function acceptProposal(s,id) {
  const p=s.projects.find(p=>p.id===id);
  if(!p) throw new Error('Project not found.');
  if(p.accepted) return s.invoices.find(i=>i.projectId===id && i.kind==='deposit');
  p.accepted=true;p.acceptedAt=new Date().toISOString();p.acceptedProposal=p.proposal;p.status='awaiting deposit';
  const workflow=s.workflows.find(w=>w.id==='w1');
  if(workflow?.enabled) return generateDeposit(s,id);
  addActivity(s,'Proposal accepted',p.name+' · Create the deposit invoice when ready','document');
}
export function generateDeposit(s,id) {
  const p=s.projects.find(p=>p.id===id);
  if(!p?.accepted) throw new Error('Accept the proposal before creating a deposit invoice.');
  const existing=s.invoices.find(i=>i.projectId===id && i.kind==='deposit');
  if(existing) return existing;
  const invoice={id:uid(),number:`INV-${String(s.invoices.length+1).padStart(3,'0')}`,projectId:id,amount:Math.round(p.budget*p.deposit/100),paid:0,due:today(),kind:'deposit'};
  s.invoices.unshift(invoice);addActivity(s,'Deposit invoice created',p.name+' · '+money(invoice.amount),'document');return invoice;
}
export function recordPayment(s,id) {
  const i=s.invoices.find(i=>i.id===id); if(!i) throw new Error('Invoice not found.');
  if(i.paid>=i.amount) return false;
  i.paid=i.amount;i.paidAt=today();
  const p=s.projects.find(p=>p.id===i.projectId);
  if(i.kind==='deposit' && p.status==='awaiting deposit')p.status='active';
  addActivity(s,'Payment recorded',projectClient(s,p).name+' · '+money(i.amount),'payment');return true;
}
export function suggestSetup(text) {
  const match=text.match(/(\d{1,3})\s*%/);const deposit=match?Number(match[1]):50;
  if(deposit<1 || deposit>100)throw new Error('The deposit must be between 1% and 100%.');
  const phases=/web|develop/i.test(text)?['Discovery','Design','Development','Launch']:/consult|strateg/i.test(text)?['Discovery','Strategy','Recommendations']:['Discovery','Design','Handoff'];
  return {deposit,phases,service:/web|develop/i.test(text)?'Web design':/consult|strateg/i.test(text)?'Consulting':'Brand identity',review:!/(auto|automatically)\s+send/i.test(text),description:text,unsupported:/hourly|recurr|monthly|stripe|bank|email integration/i.test(text)};
}
