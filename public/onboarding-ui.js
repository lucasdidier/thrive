// Post-sign-up onboarding: questions on the left, a live preview of the workspace on the right,
// like the sign-in page. Seven short steps; the four setup steps are the Getting started checklist
// (each Continue or Skip ticks it), and the last one picks where to start.
// Business rules live in onboarding-domain.js; this module only asks and shows.
import {countries,countryFlag,suggestedCurrency,needsOnboarding,saveOnboardingProfile,chooseVertical,addStarterService,recommendedWorkflows,enableStarterWorkflow,completeOnboarding} from './onboarding-domain.js';
import {verticals,starterServices} from './catalog-starters.js';
import {currencies,formatMoney} from './currency.js';
import {saveService} from './services-domain.js';
import {saveClient} from './domain.js';
import {readImageUpload} from './image-upload.js';
import {completeGettingStarted,skipGettingStarted} from './getting-started.js';
import {connectActions} from './connection-settings.js';

export const onboardingSteps=['you','business','services','clients','connect','workflows','start'];
const SETUP=['services','clients','connect','workflows','start'];
const checklist={services:'services',clients:'clients',connect:'connections',workflows:'workflows'};
const units={item:'Fixed price',hour:'Per hour',day:'Per day',week:'Per week',month:'Per month'};
const placeholderName=name=>!String(name||'').trim()||/^your name$/i.test(String(name).trim());
const initials=name=>String(name||'').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';

// Where to resume: the saved domain step, then the screen inside it. Everyone sees "you" first,
// even with a name from Google, so they can add a photo.
export function resumeStep(s){
 const o=s.settings.onboarding||{};
 if(o.step==='profile'||!o.step)return o.setupStep==='business'?'business':'you';
 if(o.step==='vertical')return 'business';
 return SETUP.includes(o.setupStep)?o.setupStep:'services';
}

export function createOnboardingUI({getState,save,saveProfile,btn,esc,icon,importClients,start}){
 let root=null,step='you',busy=false,connection=null,connectionLoaded=false;
 const draft={};
 const S=getState;

 function fill(){
  const s=S().settings;
  Object.assign(draft,{
   name:placeholderName(s.name)?'':s.name,photo:s.profilePhoto||'',
   businessName:s.businessName||'',vertical:s.vertical||'',country:s.country||'',currency:s.currency||'USD',currencyTouched:!!s.country,
   picked:null,prices:{},client:{name:'',contact:'',email:''},flows:null,
  });
 }
 const services=()=>draft.vertical?starterServices(draft.vertical).filter(x=>x.kind==='service'):[];
 const flows=()=>recommendedWorkflows(draft.vertical||'general');
 const price=x=>draft.prices[x.starterKey]??x.items[0].rate;
 const money=cents=>formatMoney(cents,draft.currency||'USD');

 // ---- Left: one question group per step ----
 const field=(label,control,hint='')=>`<label class="ob-field"><span>${label}</span>${control}${hint?`<small>${hint}</small>`:''}</label>`;
 const select=(name,options,value,placeholder)=>`<select name="${name}" required>${placeholder?`<option value="" ${value?'':'selected'} disabled>${placeholder}</option>`:''}${options.map(([v,l])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
 const views={
  you:()=>({title:'Welcome to Thrive',lede:'Let’s set up your workspace. It takes about two minutes.',body:`
   ${field('Your name',`<input name="name" autocomplete="name" maxlength="80" required value="${esc(draft.name)}" placeholder="Alex Morgan">`)}
   <div class="ob-field"><span>Profile photo <em>Optional</em></span><div class="ob-photo">${avatar('lg')}<label class="btn">${icon('camera')}${draft.photo?'Change photo':'Upload photo'}<input type="file" name="photo" accept="image/png,image/jpeg,image/webp" hidden></label>${draft.photo?`<button type="button" class="btn ob-quiet" data-ob="photo-remove">Remove</button>`:''}</div></div>`}),
  business:()=>({title:'About your business',lede:'This sets your currency, your suggested services and how your documents look.',body:`
   ${field('Business name <em>Optional</em>',`<input name="businessName" autocomplete="organization" maxlength="80" value="${esc(draft.businessName)}" placeholder="${esc(draft.name||'Morgan Studio')}">`,'Leave empty to use your own name on documents.')}
   ${field('What do you do?',select('vertical',Object.entries(verticals),draft.vertical,'Choose your business type'))}
   <div class="ob-row">${field('Country',select('country',countries,draft.country,'Choose your country'))}
   ${field('Currency',select('currency',Object.entries(currencies).map(([c,n])=>[c,`${c} · ${n}`]),draft.currency))}</div>`}),
  services:()=>{draft.picked??=new Set(services().slice(0,3).map(x=>x.starterKey));return {title:'Your services',lede:`Suggested for ${esc(verticals[draft.vertical]||'your business')}. Keep the ones you offer and set your prices. You can change them anytime.`,body:`
   <ul class="ob-list">${services().map(x=>`<li class="ob-svc${draft.picked.has(x.starterKey)?' is-on':''}"><label class="ob-check"><input type="checkbox" name="svc" value="${x.starterKey}" ${draft.picked.has(x.starterKey)?'checked':''}><span><b>${esc(x.name)}</b><small>${units[x.unit]||units.item}</small></span></label><label class="ob-price"><span class="ob-cur">${esc(draft.currency)}</span><input type="number" name="price:${x.starterKey}" min="0" step="1" inputmode="decimal" value="${Math.round(price(x)/100)}" aria-label="Price for ${esc(x.name)}"></label></li>`).join('')}</ul>`};},
  clients:()=>{const n=S().clients.length;return {title:'Add your first client',lede:n?`You have ${n} client${n===1?'':'s'} in Thrive. Add another, or continue.`:'Add someone you work with now, or bring them all in from a spreadsheet.',body:`
   ${field('Client or company name',`<input name="clientName" maxlength="100" value="${esc(draft.client.name)}" placeholder="Juniper Studio">`)}
   <div class="ob-row">${field('Contact person <em>Optional</em>',`<input name="clientContact" maxlength="100" value="${esc(draft.client.contact)}" placeholder="Sophie Chen">`)}
   ${field('Email',`<input name="clientEmail" type="email" maxlength="254" value="${esc(draft.client.email)}" placeholder="sophie@juniper.studio">`)}</div>
   <button type="button" class="ob-alt" data-ob="import">${icon('download')}Import clients from a CSV file instead</button>`};},
  connect:()=>{const c=connection,a=c?.account;return {title:'Connect email & calendar',lede:'See client emails next to their projects, send from Thrive and offer booking times from your real calendar. Nothing is sent without your review.',body:
   !connectionLoaded?`<p class="ob-note">Checking your connection…</p>`
   :a?`<p class="ob-done">${icon('check')}Connected as <b>${esc(a.email||'your account')}</b></p>`
   :c?.configured?`<div class="ob-connect">${connectActions(c,btn)}</div><p class="ob-note">You’ll come back here after you allow access.</p>`
   :`<p class="ob-note">Email & calendar connections aren’t available yet. You can connect later in Settings.</p>`};},
  workflows:()=>{draft.flows??=new Set(flows().slice(0,2).map(f=>f.key));return {title:'Automate the busywork',lede:'Workflows run in the background. Pick a few to start with; you can edit or turn them off anytime.',body:`
   <ul class="ob-list">${flows().map(f=>`<li><label class="ob-toggle"><span><b>${esc(f.name)}</b><small>${esc(f.description)}</small></span><input type="checkbox" role="switch" name="flow" value="${f.key}" ${draft.flows.has(f.key)?'checked':''}></label></li>`).join('')}</ul>`};},
  start:()=>({title:`You’re all set${draft.name?', '+esc(draft.name.split(/\s+/)[0]):''}`,lede:'Where would you like to start?',body:`
   <div class="ob-starts">${[['invoice','invoices','Create an invoice','Bill a client for work you’ve done'],['proposal','documents','Create a proposal','Scope and price a new project'],['contract','signature','Create a contract','Get your terms signed online']].map(([k,glyph,label,sub])=>`<button type="button" class="ob-start" data-ob="start" data-kind="${k}"><span class="feature-icon feature-icon--lg">${icon(glyph)}</span><span><b>${label}</b><small>${sub}</small></span>${icon('arrow')}</button>`).join('')}</div>
   <button type="button" class="ob-alt" data-ob="start" data-kind="workspace">Go straight to my workspace ${icon('arrow')}</button>`}),
 };

 // ---- Right: a live preview of what the answers change ----
 function avatar(size=''){return draft.photo?`<img class="ob-av ${size}" src="${esc(draft.photo)}" alt="">`:`<span class="ob-av ${size}">${draft.name?esc(initials(draft.name)):icon('user')}</span>`;}
 function preview(){
  const name=draft.name||'Your name',first=(draft.name||'').split(/\s+/)[0],biz=draft.businessName||draft.name||'Your business';
  const chrome=inner=>`<div class="ob-window"><div class="ob-bar"><i></i><i></i><i></i></div>${inner}</div>`;
  const side=`<div class="ob-pside"><span class="ob-pbrand"><img src="/favicon.svg" alt="">thrive</span>${['home','projects','clients','time','documents','invoices'].map((g,i)=>`<span class="ob-pnav${i===0?' on':''}">${icon(g)}<i style="--w:${[44,56,48,36,62,52][i]}%"></i></span>`).join('')}<span class="ob-pme">${avatar()}<span><b>${esc(name)}</b><small>${esc(biz)}</small></span></span></div>`;
  const svcs=services().filter(x=>draft.picked?draft.picked.has(x.starterKey):true).slice(0,4);
  switch(step){
   case 'you':return chrome(`<div class="ob-app">${side}<div class="ob-pmain"><h4>Good morning${first?', '+esc(first):''}</h4><p>Your workspace</p><div class="ob-pcards"><span></span><span></span><span></span></div></div></div>`);
   case 'business':case 'start':{const sample=svcs[0]||{name:'Project work',items:[{rate:250000}]};return `<div class="ob-paper"><div class="ob-phead">${avatar('sm')}<b>${esc(biz)}</b>${draft.country?`<small>${countryFlag(draft.country)}</small>`:''}</div><p class="ob-kind">Invoice · INV-001</p><p class="ob-to">Billed to <b>${esc(S().clients.at(-1)?.name||'Your first client')}</b></p><div class="ob-line"><span>${esc(sample.name)}</span><b>${money(price(sample))}</b></div><div class="ob-line ob-total"><span>Total due</span><b>${money(price(sample))}</b></div>${draft.vertical?`<p class="ob-tag">${esc(verticals[draft.vertical])}</p>`:''}</div>`;}
   case 'services':return chrome(`<div class="ob-plist"><h4>Services & packages</h4>${(svcs.length?svcs:[{name:'Choose a service',unit:'item',items:[{rate:0}]}]).map(x=>`<div class="ob-prow">${icon('tag')}<span>${esc(x.name)}<small>${units[x.unit]||''}</small></span><b>${money(price(x))}</b></div>`).join('')}</div>`);
   case 'clients':{const rows=[...S().clients.slice(-2).map(c=>[c.name,c.email]),...(draft.client.name?[[draft.client.name,draft.client.email]]:[])].slice(-3);return chrome(`<div class="ob-plist"><h4>Clients</h4>${(rows.length?rows:[['Your first client','client@example.com']]).map(([n,e])=>`<div class="ob-prow"><span class="ob-av sm">${esc(initials(n))}</span><span>${esc(n)}<small>${esc(e||'')}</small></span><em>Active</em></div>`).join('')}<div class="ob-prow ghost"><span class="ob-av sm"></span><span><i></i></span></div></div>`);}
   case 'connect':return chrome(`<div class="ob-plist"><h4>Today</h4><div class="ob-event">${icon('calendar')}<span>Discovery call<small>10:30 · from your calendar</small></span></div><div class="ob-event">${icon('calendar')}<span>Design review<small>14:00 · from your calendar</small></span></div><h4>Emails</h4><div class="ob-prow">${icon('mail')}<span>Re: Brand identity<small>Linked to Juniper Studio</small></span></div></div>`);
   case 'workflows':return chrome(`<div class="ob-plist"><h4>Workflows</h4>${flows().filter(f=>draft.flows?.has(f.key)).map(f=>`<div class="ob-flow"><span>${icon('workflows')}When ${esc(f.description.split(',')[0].replace(/^When /,'').toLowerCase())}</span><i></i><span>${icon('check')}${esc(f.name)}</span></div>`).join('')||'<p class="ob-empty">Pick a workflow to see it here.</p>'}</div>`);
  }
  return '';
 }

 function paint(focus=true){
  const v=views[step](),i=onboardingSteps.indexOf(step),setup=checklist[step];
  root.innerHTML=`<section class="ob-side">
   <header class="ob-head"><span class="ob-brand"><img src="/favicon.svg" width="28" height="28" alt="">thrive</span><span class="ob-steps" aria-label="Step ${i+1} of ${onboardingSteps.length}">${onboardingSteps.map((_,j)=>`<i class="${j<i?'done':j===i?'on':''}"></i>`).join('')}</span></header>
   <form class="ob-main" novalidate><div class="ob-card">
    <p class="ob-kicker">Step ${i+1} of ${onboardingSteps.length}</p><h1 id="ob-title" tabindex="-1">${v.title}</h1><p class="ob-lede">${v.lede}</p>
    <div class="ob-body">${v.body}</div><p class="ob-error" role="alert"></p>
    ${step==='start'?'':`<div class="ob-actions">${i>0?`<button type="button" class="btn ob-quiet" data-ob="back" aria-label="Back">${icon('arrow')}<span class="ob-back-label">Back</span></button>`:'<span></span>'}<span class="ob-go">${setup?`<button type="button" class="btn ob-quiet" data-ob="skip">Skip for now</button>`:''}<button type="submit" class="btn primary">Continue</button></span></div>`}
   </div></form></section>
   <aside class="ob-preview" aria-hidden="true"><div class="ob-stage ob-stage--${step}">${preview()}</div></aside>`;
  if(focus)root.querySelector('#ob-title')?.focus({preventScroll:true});
 }
 const repaintPreview=()=>{const stage=root.querySelector('.ob-stage');if(stage){stage.className=`ob-stage ob-stage--${step}`;stage.innerHTML=preview();}};
 const fail=message=>{const box=root.querySelector('.ob-error');if(box)box.textContent=message;};

 async function go(next){
  step=next;
  const s=S(),o=s.settings.onboarding,saves=o?.step==='setup'?SETUP.includes(next):o?.step==='profile'&&next==='business';if(saves&&o.setupStep!==next){s.settings.onboarding={...o,setupStep:next};await save();}
  paint();
  if(next==='connect'&&!connectionLoaded)loadConnection();
 }
 async function loadConnection(){
  try{const r=await fetch('/api/communications',{cache:'no-store',signal:AbortSignal.timeout(15000)});connection=r.ok?(await r.json()).connection:null;}catch{connection=null;}
  connectionLoaded=true;if(connection?.account?.gmail&&connection.account.calendar)completeGettingStarted(S(),'connections');
  if(step==='connect')paint(false);
 }
 const next=()=>onboardingSteps[onboardingSteps.indexOf(step)+1];
 const read=()=>Object.fromEntries(new FormData(root.querySelector('form')));

 // ---- Continue: validate, save, move on ----
 async function submit(skipping=false){
  if(busy)return;busy=true;fail('');
  const s=S(),values=read();
  try{
   if(step==='you'){
    const name=String(values.name||'').trim();if(!name)throw Error('Enter your name.');if(name.length>80)throw Error('Keep your name under 80 characters.');
    draft.name=name;await saveProfile({name,profilePhoto:draft.photo});
   }else if(step==='business'){
    Object.assign(draft,{businessName:String(values.businessName||'').trim(),vertical:values.vertical||'',country:values.country||'',currency:values.currency||draft.currency});
    if(!draft.vertical)throw Error('Choose your business type.');if(!draft.country)throw Error('Choose your country.');
    saveOnboardingProfile(s,{name:draft.name||s.settings.name,businessName:draft.businessName,country:draft.country,currency:draft.currency});
    chooseVertical(s,draft.vertical);s.settings.onboarding={...s.settings.onboarding,setupStep:'services'};
    draft.picked=null;draft.flows=null;await save();
   }else if(step==='services'){
    const keys=skipping?[]:[...root.querySelectorAll('[name=svc]:checked')].map(x=>x.value);
    for(const key of keys){const svc=addStarterService(s,key),rate=Math.round(Math.max(0,Number(values['price:'+key])||0)*100);if(svc.items?.[0]&&svc.items[0].rate!==rate){const updated=saveService(s,{...svc,items:[{...svc.items[0],rate}]},svc.id);updated.starterKey=key;}}
    keys.length?completeGettingStarted(s,'services'):skipGettingStarted(s,'services');await save();
   }else if(step==='clients'){
    const name=String(values.clientName||'').trim(),email=String(values.clientEmail||'').trim(),contact=String(values.clientContact||'').trim();
    if(!skipping&&(name||email)){saveClient(s,{type:contact?'company':'individual',name,contact,email});draft.client={name:'',contact:'',email:''};completeGettingStarted(s,'clients');}
    else if(s.clients.length)completeGettingStarted(s,'clients');else skipGettingStarted(s,'clients');
    await save();
   }else if(step==='connect'){
    if(connection?.account?.gmail&&connection.account.calendar)completeGettingStarted(s,'connections');else skipGettingStarted(s,'connections');await save();
   }else if(step==='workflows'){
    const keys=skipping?[]:[...root.querySelectorAll('[name=flow]:checked')].map(x=>x.value);
    keys.forEach(k=>enableStarterWorkflow(s,k));keys.length?completeGettingStarted(s,'workflows'):skipGettingStarted(s,'workflows');await save();
   }
   busy=false;await go(next());
  }catch(err){busy=false;fail(err.message||'Something went wrong. Please try again.');}
 }

 async function finish(kind){
  if(busy)return;busy=true;fail('');
  try{completeOnboarding(S());await save();hide();start(kind);}
  catch(err){busy=false;fail(err.message||'Something went wrong. Please try again.');}
 }

 function hide(){root?.remove();root=null;document.documentElement.classList.remove('is-onboarding');busy=false;}

 function mount(){
  fill();step=resumeStep(S());
  root=document.createElement('div');root.className='ob';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','ob-title');
  document.body.append(root);document.documentElement.classList.add('is-onboarding');
  root.addEventListener('submit',e=>{e.preventDefault();submit();});
  root.addEventListener('click',e=>{
   const b=e.target.closest('[data-ob]');if(!b)return;const a=b.dataset.ob;
   if(a==='back'){const i=onboardingSteps.indexOf(step);if(i>0){step=onboardingSteps[i-1];paint();}}
   else if(a==='skip')submit(true);
   else if(a==='photo-remove'){draft.photo='';paint(false);}
   else if(a==='import'){importClients();}
   else if(a==='start')finish(b.dataset.kind);
  });
  root.addEventListener('input',e=>{
   const t=e.target;
   if(t.name==='name'){draft.name=t.value.trim();const av=root.querySelector('.ob-photo .ob-av');if(av&&!draft.photo)av.outerHTML=avatar('lg');}
   else if(t.name==='businessName')draft.businessName=t.value.trim();
   else if(t.name==='clientName')draft.client.name=t.value.trim();
   else if(t.name==='clientEmail')draft.client.email=t.value.trim();
   else if(t.name==='clientContact')draft.client.contact=t.value.trim();
   else if(t.name?.startsWith('price:'))draft.prices[t.name.slice(6)]=Math.round(Math.max(0,Number(t.value)||0)*100);
   else return;
   repaintPreview();
  });
  root.addEventListener('change',async e=>{
   const t=e.target;
   if(t.name==='photo'&&t.files?.[0]){try{draft.photo=await readImageUpload(t.files[0],{square:true});paint(false);}catch(err){fail(err.message);}return;}
   if(t.name==='vertical')draft.vertical=t.value;
   else if(t.name==='country'){draft.country=t.value;if(!draft.currencyTouched){const c=suggestedCurrency(t.value);if(c&&currencies[c]){draft.currency=c;root.querySelector('[name=currency]').value=c;}}}
   else if(t.name==='currency'){draft.currency=t.value;draft.currencyTouched=true;}
   else if(t.name==='svc'){t.checked?draft.picked.add(t.value):draft.picked.delete(t.value);t.closest('.ob-svc')?.classList.toggle('is-on',t.checked);}
   else if(t.name==='flow'){t.checked?draft.flows.add(t.value):draft.flows.delete(t.value);}
   else return;
   repaintPreview();
  });
  paint();if(step==='connect')loadConnection();
 }

 return {
  active:()=>needsOnboarding(S()),
  // Shown over the app until finished; later renders (sync, imports) only refresh it.
  show(){if(!root)mount();else if(step==='clients'){paint(false);}},
  hide,
  get open(){return !!root;},
 };
}
