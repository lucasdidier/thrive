export function baseSeed() {
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
      {id:'p1',clientId:'c1',name:'Juniper brand identity',service:'Brand identity',budget:600000,status:'active',deposit:50,phases:[{name:'Discovery',done:true},{name:'Design',done:false},{name:'Handoff',done:false}],due:'2026-10-28',proposal:'Visual identity for Juniper Studio. Includes creative direction, a primary logo and supporting marks, a color palette, typography, and a concise brand guide.',accepted:true},
      {id:'p2',clientId:'c2',name:'Orbit website',service:'Web design',budget:650000,status:'active',deposit:50,phases:[{name:'Discovery',done:true},{name:'Design',done:true},{name:'Handoff',done:false}],due:'2026-10-24',proposal:'Design and build a responsive product website for Orbit.',accepted:true},
      {id:'p3',clientId:'c3',name:'The autumn edition',service:'Editorial design',budget:200000,status:'completed',deposit:50,phases:[{name:'Discovery',done:true},{name:'Design',done:true},{name:'Handoff',done:true}],due:'2026-10-10',proposal:'Editorial design and production-ready artwork.',accepted:true},
      {id:'p4',clientId:'c4',name:'Paper & Pine brand refresh',service:'Brand identity',budget:400000,status:'proposal',deposit:50,phases:[{name:'Discovery',done:false},{name:'Design',done:false},{name:'Handoff',done:false}],due:'2026-11-14',proposal:'Develop the creative direction, refine the logo, and define colors and typography. Deliver logo files and a brand guide.',accepted:false},
      {id:'p5',clientId:'c5',name:'Sunday brand strategy',service:'Brand strategy',budget:250000,status:'inquiry',deposit:50,phases:[{name:'Discovery',done:false},{name:'Design',done:false},{name:'Handoff',done:false}],due:'2026-11-20',proposal:'Define brand positioning, target audience, and messaging.',accepted:false}
    ],
    invoices:[
      {id:'i1',number:'INV-001',projectId:'p1',amount:300000,paid:300000,due:'2026-10-02',paidAt:'2026-10-02',kind:'deposit'},
      {id:'i2',number:'INV-002',projectId:'p2',amount:325000,paid:325000,due:'2026-10-04',paidAt:'2026-10-04',kind:'deposit'},
      {id:'i3',number:'INV-003',projectId:'p3',amount:200000,paid:200000,due:'2026-10-08',paidAt:'2026-10-08',kind:'final'},
      {id:'i4',number:'INV-004',projectId:'p1',amount:180000,paid:0,due:'2026-10-15',kind:'milestone'},
      {id:'i5',number:'INV-005',projectId:'p2',amount:300000,paid:0,due:'2026-10-24',kind:'milestone'}
    ],
    time:[{id:'t1',projectId:'p1',hours:18.5,note:'Creative direction and identity exploration',date:'2026-10-16'},{id:'t2',projectId:'p2',hours:14,note:'Design and development',date:'2026-10-16'}],
    workflows:[{id:'w1',name:'Deposit invoicing',description:'Agreement accepted → deposit invoice → project ready',enabled:true},{id:'w2',name:'Post-meeting follow-up',description:'Meeting completed → proposal & email drafts',enabled:false}],
    activity:[{id:'a1',text:'Juniper Studio paid the deposit',detail:'Brand identity · $3,000',time:'Oct 2',kind:'payment'},{id:'a2',text:'Paper & Pine proposal is ready',detail:'Brand identity · Waiting for your review',time:'Oct 16',kind:'document'},{id:'a3',text:'A new inquiry from Sunday Goods',detail:'Brand strategy · Website form',time:'Oct 17',kind:'client'}]
  };
}
