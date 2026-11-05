// Fictional showcase workspace for marketing screenshots (landing page). Built only through
// domain functions so every record is valid. All names and emails are made up (.example).
import {readFileSync} from 'node:fs';
import {saveClient,createProject} from '../public/domain.js';
import {submitForm,createDocument,publishDocument,respondDocument} from '../public/workspace-domain.js';
import {savePortal,portalCandidates} from '../public/portal-domain.js';
import {saveTimeEntry} from '../public/time-domain.js';
import {startTimer} from '../public/timer-domain.js';
import {saveInvoiceDraft,issueInvoiceDraft} from '../public/invoice-domain.js';
import {saveWorkflow,runWorkflows,initWorkflows} from '../public/workflow-domain.js';
import {initCRM} from '../public/crm-domain.js';
import {initScheduling,saveMeetingType,availableSlots,bookMeeting} from '../public/scheduling-domain.js';

const day=(base,offset)=>{const d=new Date(base);d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10);};
const at=(base,offset,h,m=0)=>{const d=new Date(base);d.setDate(d.getDate()+offset);d.setHours(h,m,0,0);return d;};

export function showcaseWorkspace(s,now=new Date()){
 const today=day(now,0),monday=-((now.getDay()+6)%7);
 const photo=readFileSync(new URL('./showcase/alex.webp',import.meta.url)).toString('base64'),logo=readFileSync(new URL('./showcase/studio.png',import.meta.url)).toString('base64');
 Object.assign(s.settings,{name:'Alex Morgan',business:'Morgan Studio',profilePhoto:'data:image/webp;base64,'+photo,currency:'EUR',hourlyRate:9000,workspaceLogo:'data:image/png;base64,'+logo});
 const before=structuredClone(s);
 initWorkflows(s);
 for(const w of [
  {name:'Tag new inquiries',trigger:'submission.created',action:'client.add_tag',config:{tag:'New inquiry'}},
  {name:'Tag clients after payment',trigger:'invoice.paid',action:'client.add_tag',config:{tag:'Paid'}},
  {name:'Keep a record of time worked',trigger:'time.created',action:'client.note',config:{body:'{{time.hours}} hours logged on {{project.name}}: {{time.note}}'}},
 ])saveWorkflow(s,{name:w.name,enabled:true,triggers:[{type:w.trigger,filter:{}}],steps:[{type:w.action,targetId:'related',config:w.config}]});

 // More clients across services, so the board view has real columns.
 const client=(name,contact,email,tag)=>s.clients.find(c=>c.email===email)||saveClient(s,{name,contact,email,tag});
 const ember=client('Ember Coffee','Leo Marchetti','leo@embercoffee.example','Packaging');
 const solstice=client('Solstice Studio','Maya Okafor','maya@solstice.example','Strategy');
 const willow=client('Willow Interiors','Clara Jensen','clara@willow.example','Interiors');
 const project=(c,name,budget,dueIn)=>createProject(s,{clientId:c.id,name,budget,due:day(now,dueIn),service:c.tag});
 project(ember,'Ember seasonal packaging',420000,24);
 project(solstice,'Solstice positioning sprint',360000,12);
 project(willow,'Willow showroom website',780000,40);

 // Inquiries from the website form become clients, projects and responses.
 const form=s.forms[0];
 [['Northstar Labs','Priya Shah','priya@northstar.example','Product website and launch page for our seed round.',1200000,30],
  ['Harbor & Vine','Tom Reed','tom@harborvine.example','Wine label refresh for 6 SKUs, print-ready by spring.',650000,45],
  ['Atlas Fitness','Nina Alvarez','nina@atlasfit.example','Brand identity for a new studio opening in Lisbon.',900000,60],
  ['Bloom Florals','Hana Sato','hana@bloomflorals.example','Online shop for weekly flower subscriptions.',540000,50],
  ['Quarry Architects','Daniel Kim','daniel@quarry.example','Portfolio site with project case studies.',830000,70],
  ['Fable Books','Iris Novak','iris@fablebooks.example','Cover series for a 4-book children’s collection.',480000,35]]
  .forEach(([name,contact,email,scope,budget,dueIn],i)=>submitForm(s,form.id,{name,contact,email,project:`${name} ${['website','labels','identity','shop','portfolio','covers'][i]}`,scope,budget,due:day(now,dueIn)},'showcase-'+i));
 s.submissions.forEach((x,i)=>{x.createdAt=x.submittedAt=new Date(now-((i+1)*7+3)*3600000).toISOString();});

 // A realistic week of tracked time.
 const p=name=>s.projects.find(x=>x.name===name);
 const week=[
  [0,'Juniper brand identity','Design','Logo refinements and lockups',150],
  [0,'Orbit website','Development','Navigation and responsive layout',195],
  [1,'Orbit website','Development','CMS templates for case studies',240],
  [1,'Solstice positioning sprint','Workshop','Stakeholder interviews',120],
  [2,'Juniper brand identity','Design','Colour palette and type pairing',165],
  [2,'Ember seasonal packaging','Design','Dieline and moodboard',90],
  [3,'Willow showroom website','Discovery','Sitemap and content inventory',105],
  [3,'Juniper brand identity','Meetings','Brand review with Sophie',45],
 ];
 for(const [offset,name,task,note,minutes] of week){const proj=p(name);if(proj&&monday+offset<=0)saveTimeEntry(s,{projectId:proj.id,minutes,date:day(now,monday+offset),task,note,billable:task!=='Meetings'});}

 // A detailed invoice to preview.
 const orbit=p('Orbit website');
 if(orbit){
  const d=saveInvoiceDraft(s,{title:'Orbit website · Phase 2',clientId:orbit.clientId,projectId:orbit.id,issued:today,due:day(now,14),taxRate:23,
   items:[{description:'Design system and components',details:'Tokens, typography scale, 24 components',quantity:1,rate:280000},{description:'Case study templates',details:'CMS-driven layouts with responsive images',quantity:3,rate:65000},{description:'Development',details:'Tracked time, Oct 26 – Nov 5',quantity:22,rate:9000},{description:'Launch support',quantity:1,rate:45000}],
   notes:'Thanks for a great collaboration, Orbit team!',paymentInstructions:'Bank transfer to Morgan Studio\nIBAN PT50 0000 0000 0000 0000 0000 0 · BIC MORGPTPL'});
  issueInvoiceDraft(s,d.id);
 }
 runWorkflows(s,before);

 // Booking pages and upcoming meetings booked through them.
 initScheduling(s,'Europe/Lisbon');
 saveMeetingType(s,{name:'Brand workshop',description:'A working session to shape your brand direction.',duration:90,buffer:15,location:'Google Meet',active:true});
 saveMeetingType(s,{name:'Project check-in',description:'A quick update on progress and next steps.',duration:30,buffer:10,location:'Google Meet',active:true});
 const types=s.scheduling.types;
 [['discovery','Northstar Labs','Priya Shah','priya@northstar.example','Seed-round launch site'],
  [types[1]?.id,'Harbor & Vine','Tom Reed','tom@harborvine.example','Label refresh kickoff'],
  [types[2]?.id,'Orbit','James Wilson','james@orbit.example','Phase 2 review'],
  ['discovery','Bloom Florals','Hana Sato','hana@bloomflorals.example','Subscription shop scope'],
  [types[1]?.id,'Atlas Fitness','Nina Alvarez','nina@atlasfit.example','Identity direction'],
 ].forEach(([typeId,name,contact,email,brief],i)=>{
  for(let d=1+i;d<20;d++){const slots=availableSlots(s,typeId,day(now,d),now.getTime());if(slots.length){bookMeeting(s,typeId,{start:slots[Math.min(slots.length-1,2+i*3)],name,contact,email,brief},'showcase-meeting-'+i,now.getTime());break;}}
 });
 // Contracts at each stage, so the Contracts page has real rows. Created before Juniper's
 // so the signed Juniper contract stays first (the client-contract shot uses it).
 const contract=(name,title,scope,stage,signer)=>{
  const cl=s.clients.find(c=>c.name===name);if(!cl||s.documents.some(d=>d.kind==='contract'&&d.clientId===cl.id))return;
  const proj=s.projects.find(x=>x.clientId===cl.id);
  const d=createDocument(s,{clientId:cl.id,projectId:proj?.id,kind:'contract',title,showPricing:false,scope});
  if(stage!=='draft')publishDocument(s,d.id);if(stage==='signed')respondDocument(s,d.id,1,'sign',{name:signer,consent:true});
 };
 contract('Paper & Pine','Brand refresh agreement','Morgan Studio will refresh the Paper & Pine identity: logo, palette and packaging system.','draft');
 contract('Forma','Editorial design agreement','Morgan Studio will design the layout system for The autumn edition, 96 pages, print-ready.','signed','Emma Davis');
 contract('Orbit','Website development agreement','Morgan Studio will design and build Phase 2 of the Orbit website: design system, case study templates and launch support.','sent');
 // A signed contract and a client portal, so the client-facing pages have real content.
 const juniper=s.clients.find(c=>c.name==='Juniper Studio');
 if(juniper&&!s.documents.some(d=>d.kind==='contract'&&d.clientId===juniper.id)){
  const c=createDocument(s,{clientId:juniper.id,projectId:s.projects.find(x=>x.clientId===juniper.id&&x.name==='Juniper brand identity')?.id,kind:'contract',title:'Brand identity agreement',showPricing:false,
   scope:'Morgan Studio will design a visual identity for Juniper Studio, as set out in the accepted proposal “Juniper brand identity”.',
   deliverables:'Primary logo and supporting marks\nColour palette and typography\nBrand guide (PDF)',
   terms:'Fee: €6,000.00 in three payments: €3,000.00 deposit on signature, €1,800.00 when the logo and palette are approved, €1,200.00 on delivery.\nTwo rounds of revisions are included at each stage.\nRights to the final files transfer to Juniper Studio once the final invoice is paid.'});
  publishDocument(s,c.id);respondDocument(s,c.id,1,'sign',{name:'Sophie Chen',consent:true});
  const options=portalCandidates(s,juniper.id);
  savePortal(s,juniper.id,{enabled:true,title:'Juniper Studio × Morgan Studio',intro:'Everything for your brand identity project in one place: documents to review, invoices and progress.',sections:{documents:true,invoices:true,projects:true,forms:false,meetings:false},documents:options.documents.map(d=>d.id),invoices:options.invoices.map(i=>i.id),projects:options.projects.map(p=>p.id)});
 }
 // Clients open on the board grouped by service.
 initCRM(s).active.clients='board';
 // A timer that has been running for 1 h 12 min.
 const live=p('Orbit website');
 if(live&&!(s.runningTimers||[]).length)startTimer(s,{projectId:live.id,task:'Development',note:'Homepage hero animation'},'workspace-owner',now.getTime()-72*60000);
 return s;
}

// Client email conversations for the Emails page, in the shape listConversations returns.
export function showcaseThreads(s,now=new Date()){
 const ago=h=>new Date(now.getTime()-h*3600000).toISOString();
 const me='alex@morgan.example';
 const thread=(id,name,subject,messages)=>{
  const c=s.clients.find(x=>x.name===name);if(!c)return null;
  const msgs=messages.map(([dir,hours,body],i)=>({id:`${id}-m${i}`,from:dir==='in'?c.email:me,to:dir==='in'?me:c.email,subject:i?'Re: '+subject:subject,date:ago(hours),body,bodyFormat:'text',direction:dir==='in'?'incoming':'outgoing'}));
  return {id,provider:'nylas',subject,messages:msgs,truncated:false,updatedAt:msgs.at(-1).date,clientId:c.id,projectId:s.projects.find(p=>p.clientId===c.id)?.id||null,archived:false};
 };
 return [
  thread('t1','Juniper Studio','Logo lockups · final round',[['out',30,'Hi Sophie,\n\nThe final lockups are in your portal: primary, stacked and the monogram. Let me know which colour you prefer for the wordmark.\n\nAlex'],['in',2,'Hi Alex,\n\nLove them! Could we see the wordmark in the darker green too? Then we’re ready to sign off.\n\nSophie']]),
  thread('t2','Northstar Labs','Seed-round launch site',[['in',5,'Hi Alex,\n\nThanks for the call today. Sharing our pitch deck and the two sites we like. Could you send a proposal by Friday?\n\nPriya']]),
  thread('t3','Orbit','Phase 2 invoice',[['out',8,'Hi James,\n\nHere’s the invoice for Phase 2 of the website. You can pay online from the link, and the case study templates are live on staging.\n\nThanks,\nAlex']]),
  thread('t4','Harbor & Vine','Label refresh · print specs',[['in',26,'Hi Alex,\n\nOur printer needs 3 mm bleed and CMYK files. Is that OK for the six SKUs?\n\nTom'],['out',24,'Hi Tom,\n\nNo problem, I’ll set up the dielines with 3 mm bleed. Expect the first round next Tuesday.\n\nAlex']]),
  thread('t5','Ember Coffee','Seasonal packaging moodboard',[['in',47,'Hi Alex,\n\nThe winter moodboard is perfect. Can we add a version with the copper foil?\n\nLeo']]),
  thread('t6','Bloom Florals','Subscription shop scope',[['in',52,'Hi Alex,\n\nLooking forward to our call. We’d like weekly and monthly plans, plus gift cards.\n\nHana']]),
 ].filter(Boolean);
}

// Calendar events for the dashboard, in the shape listNylasEvents returns.
export function showcaseEvents(now=new Date()){
 const ev=(id,title,offset,h,m,dur,extra={})=>{const start=at(now,offset,h,m);return {id,title,allDay:false,start:start.toISOString(),end:new Date(start.getTime()+dur*60000).toISOString(),location:'',description:'',meeting:null,organizer:{name:'Alex Morgan',email:'alex@morgan.example'},guests:[],calendarUrl:'',recurring:false,...extra};};
 const meet=code=>({url:`https://meet.google.com/${code}`,provider:'Google Meet',code});
 return [
  ev('e1','Weekly planning',0,9,0,30,{recurring:true}),
  ev('e2','Brand review · Juniper Studio',0,10,30,45,{meeting:meet('jun-brnd-rvw'),guests:[{name:'Alex Morgan',email:'alex@morgan.example',status:'accepted'},{name:'Sophie Chen',email:'sophie@juniper.example',status:'accepted'},{name:'Mark Ellis',email:'mark@juniper.example',status:'tentative'}],description:'Agenda\n• Final logo lockups\n• Colour palette sign-off\n• Next steps for the brand guide'}),
  ev('e3','Discovery call · Northstar Labs',0,14,0,30,{meeting:meet('nst-dsc-cll'),guests:[{name:'Priya Shah',email:'priya@northstar.example',status:'accepted'}],description:'Website scope, timeline and budget for the seed-round launch.'}),
  ev('e4','Orbit website check-in',0,16,30,30,{meeting:meet('orb-chk-inn'),guests:[{name:'James Wilson',email:'james@orbit.example',status:'pending'}]}),
  ev('e5','Ember packaging workshop',1,11,0,90,{location:'Ember Coffee roastery, Rua das Flores 12'}),
 ];
}
