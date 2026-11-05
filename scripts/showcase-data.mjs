// Fictional showcase workspace for marketing screenshots (landing page). Built only through
// domain functions so every record is valid. All names and emails are made up (.example).
import {readFileSync} from 'node:fs';
import {saveClient,createProject} from '../public/domain.js';
import {submitForm} from '../public/workspace-domain.js';
import {saveTimeEntry} from '../public/time-domain.js';
import {startTimer} from '../public/timer-domain.js';
import {saveInvoiceDraft,issueInvoiceDraft} from '../public/invoice-domain.js';
import {saveWorkflow,runWorkflows,initWorkflows} from '../public/workflow-domain.js';
import {initCRM} from '../public/crm-domain.js';

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

 // Clients open on the board grouped by service.
 initCRM(s).active.clients='board';
 // A timer that has been running for 1 h 12 min.
 const live=p('Orbit website');
 if(live&&!(s.runningTimers||[]).length)startTimer(s,{projectId:live.id,task:'Development',note:'Homepage hero animation'},'workspace-owner',now.getTime()-72*60000);
 return s;
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
