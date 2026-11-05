import {flows} from './landing-flows.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
$('#year').textContent=new Date().getFullYear();
if(new URLSearchParams(location.search).get('access')==='pending'){$('#pending').hidden=false;history.replaceState(null,'','/');}

// Crossfade: fade and blur out, swap, fade back in. Instant with reduced motion.
function swap(els,change){
 if(reduce.matches){change();return;}
 els.forEach(e=>e.classList.add('swap-out'));
 setTimeout(()=>{change();requestAnimationFrame(()=>els.forEach(e=>e.classList.remove('swap-out')));},200);
}

// ---- How a project runs: one slider drives the clause and the real screen. ----
const stages=[
 {name:'Inquiry',clause:'First, an inquiry arrives.',note:'Your intake form creates the client and the project, ready for a call.',when:'Form submitted',then:'Add client tag “New inquiry”',img:'forms',alt:'Form responses from new inquiries, each linked to a client and project',dx:-198},
 {name:'Call',clause:'Then they book a call.',note:'Booking pages only offer times your calendar is free, and every booking lands on the client.',when:'Meeting completed',then:'Draft meeting follow-up',img:'scheduling',alt:'Scheduling page with five upcoming meetings booked by clients',dx:-198},
 {name:'Proposal',clause:'Next, they say yes.',note:'A branded proposal with its fee and payment schedule. Your client accepts it online.',when:'Proposal accepted',then:'Create deposit invoice',img:'proposal',alt:'Client view of the accepted Juniper brand identity proposal, €6,000 in three payments',dx:-606},
 {name:'The work',clause:'You do the work.',note:'Track time from any page. Unbilled hours turn into an invoice draft in one click.',when:'Time entry added',then:'Add client note',img:'time',alt:'Time tracker with a timer running on the Orbit website and the week’s entries',dx:-198},
 {name:'Paid',clause:'Finally, you get paid.',note:'Clear invoices with your logo, tax and payment details. Record payments as they land.',when:'Invoice fully paid',then:'Add client tag “Paid”',img:'invoice',alt:'Client preview of invoice INV-006 for Orbit, €8,831.40 with VAT',dx:-520},
];
const range=$('#stage'),view=$('.flow-view img'),say=[$('.flow-clause'),$('.flow-note'),$('.flow-chain')];
let stageAt=0;
// Preload the stage screens once the section is near, so a swap never waits on the network.
new IntersectionObserver((entries,o)=>{if(entries.some(e=>e.isIntersecting)){stages.forEach(s=>{const i=new Image();i.src=`/landing/${s.img}.webp`;});o.disconnect();}},{rootMargin:'600px'}).observe($('#flow'));
function stage(i){
 i=Math.max(0,Math.min(stages.length-1,Number(i)));
 range.value=i;range.style.setProperty('--p',`${i/(stages.length-1)*100}%`);
 if(i===stageAt)return;
 stageAt=i;const s=stages[i];
 range.setAttribute('aria-valuetext',s.name);
 $$('.flow-names button').forEach(b=>{if(Number(b.dataset.stage)===i)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
 swap([...say,view],()=>{
  say[0].textContent=s.clause;say[1].textContent=s.note;
  say[2].querySelector('.when').textContent=s.when;say[2].querySelector('.then').textContent=s.then;
  view.src=`/landing/${s.img}.webp`;view.alt=s.alt;placeView();
 });
}
range.addEventListener('input',()=>stage(range.value));
$$('.flow-names button').forEach(b=>b.addEventListener('click',()=>stage(b.dataset.stage)));
// Offsets are measured on the 1100px desktop render; scale them to the screen's actual width.
function placeView(){view.style.setProperty('--dx',`${Math.round(stages[stageAt].dx*view.offsetWidth/1100)}px`);}
placeView();addEventListener('resize',placeView);

// ---- What clients receive: index of documents, one sheet at a time. ----
const docTabs=$$('.out-names [role=tab]');
function showDoc(tab,focus=false){
 for(const t of docTabs){const on=t===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!on;}
 if(focus)tab.focus();
}
docTabs.forEach((t,i)=>{
 t.addEventListener('click',()=>showDoc(t));
 t.addEventListener('keydown',e=>{const n={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.key];if(n){e.preventDefault();showDoc(docTabs[(i+n+docTabs.length)%docTabs.length],true);}if(e.key==='Home'){e.preventDefault();showDoc(docTabs[0],true);}if(e.key==='End'){e.preventDefault();showDoc(docTabs.at(-1),true);}});
});

// ---- Automate: the reader configures one workflow; the pinned card follows. ----
const wf={trigger:'submission.created',action:0,tested:false,live:false,chat:false};
const card={name:$('.wf-name'),status:$('.wf-status'),trigger:$('.wf-trigger'),action:$('.wf-action'),result:$('.wf-result'),build:$('.wf-build'),chat:$('.wf-chat'),you:$('.wf-chat .you'),pair:$('.wf-pair'),chatResult:$('.wf-chat-result')};
const triggerSeg=$('[data-control=trigger]'),actionSeg=$('[data-control=action]');
const flash=el=>{if(!el||reduce.matches)return;el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');};
function renderActions(){
 actionSeg.innerHTML=flows[wf.trigger].actions.map(([,label],i)=>`<button type="button" role="radio" aria-checked="${i===wf.action}" data-value="${i}" tabindex="${i===wf.action?0:-1}">${label}</button>`).join('');
}
function renderCard(changed){
 const f=flows[wf.trigger],[,label,effect]=f.actions[wf.action];
 card.name.textContent=f.name;card.trigger.textContent=f.label;card.action.textContent=label;
 card.status.textContent=wf.live?'Active':'Draft';card.status.classList.toggle('live',wf.live);
 card.result.hidden=!wf.tested;card.result.textContent=`Test passed on “${f.record}”. ${effect} Nothing was saved.`;
 card.pair.textContent=`${f.label} → ${label}`;
 card.you.textContent=`Whenever “${f.label}” happens, ${label.charAt(0).toLowerCase()+label.slice(1)}.`;
 card.chatResult.textContent=wf.live?'It’s on. Every run shows up in Run history.':`Test passed on “${f.record}”. Turn it on?`;
 card.build.hidden=wf.chat;card.chat.hidden=!wf.chat;
 flash(changed);
}
function radios(group,onPick){
 group.addEventListener('click',e=>{const b=e.target.closest('[role=radio]');if(b)onPick(b);});
 group.addEventListener('keydown',e=>{const n={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];if(!n)return;e.preventDefault();const all=[...group.querySelectorAll('[role=radio]')],i=all.indexOf(document.activeElement),next=all[(i+n+all.length)%all.length];onPick(next,true);});
}
radios(triggerSeg,(b,focus)=>{
 wf.trigger=b.dataset.value;wf.action=0;wf.tested=false;
 triggerSeg.querySelectorAll('[role=radio]').forEach(x=>{x.setAttribute('aria-checked',String(x===b));x.tabIndex=x===b?0:-1;});
 if(focus)b.focus();renderActions();renderCard(card.trigger.parentElement);
});
radios(actionSeg,(b,focus)=>{
 wf.action=Number(b.dataset.value);wf.tested=false;renderActions();
 if(focus)actionSeg.querySelector(`[data-value="${wf.action}"]`).focus();renderCard(card.action.parentElement);
});
triggerSeg.querySelectorAll('[role=radio]').forEach((x,i)=>x.tabIndex=i?-1:0);
$('[data-control=test]').addEventListener('click',()=>{wf.tested=true;renderCard(card.result);});
$('[data-control=chat]').addEventListener('change',e=>{wf.chat=e.target.checked;renderCard();});
$('[data-control=live]').addEventListener('change',e=>{wf.live=e.target.checked;renderCard(card.status);});
renderActions();renderCard();

// ---- Header: hidden over the hero, then takes the colours of the chapter beneath it. ----
const bar=$('.bar');
const chapters=[[$('#flow'),'ink'],[$('#outputs'),'ink'],[$('#automate'),'night'],[$('.band.head'),'blue'],...$$('.band:not(.head)').map(b=>[b,b.classList.contains('alt')?'stone':'ink']),[$('#request'),'mint'],[$('.foot'),'forest']];
function headerInk(){

 let on='ink';
 for(const [el,ink] of chapters){const r=el.getBoundingClientRect();if(r.top<=32&&r.bottom>32){on=ink;break;}}
 if(bar.dataset.on!==on)bar.dataset.on=on;
}
let ticking=false;
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{headerInk();ticking=false;});}},{passive:true});
headerInk();

// ---- Entrances: heading, then text, then picture, once per section. ----
// Revealed by scroll position, so a jump link past a section never leaves it hidden.
// With reduced motion nothing is hidden at all.
const pending=new Set();
function revealDue(){for(const el of pending)if(el.getBoundingClientRect().top<innerHeight*.92){el.classList.add('in');pending.delete(el);}}
if(!reduce.matches){
 const rise=els=>els.forEach((el,i)=>{if(el.getBoundingClientRect().top<innerHeight)return;el.classList.add('rise');el.style.setProperty('--d',`${Math.min(i,4)*80}ms`);pending.add(el);});
 [['.flow-say > *','.flow-view'],['.out-index > *','.out-stage'],['.automate h2','.blk .say'],['.band.head h2'],['.claim > *'],['.foot-name','.foot-row']].forEach(g=>rise(g.flatMap(s=>$$(s))));
 $$('.band:not(.head)').forEach(b=>rise([...b.children]));
 addEventListener('scroll',()=>requestAnimationFrame(revealDue),{passive:true});
}

// ---- Claim a free spot ----
if(location.hash==='#request')$('#c-name')?.focus({preventScroll:true});
const form=$('#request-form');
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const error=form.querySelector('.error'),button=form.querySelector('button');
 const data=Object.fromEntries(new FormData(form));
 error.textContent='';
 if(!data.name.trim()){error.textContent='Enter your name.';$('#c-name').focus();return;}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())){error.textContent='Enter a valid email address.';$('#c-email').focus();return;}
 button.disabled=true;button.textContent='Saving…';
 try{
  const r=await fetch('/api/beta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(body.error||'That didn’t go through. Please try again.');
  form.hidden=true;$('.done').hidden=false;$('.done').setAttribute('tabindex','-1');$('.done').focus();
 }catch(e){error.textContent=e.message;}
 finally{button.disabled=false;button.textContent='Save my spot';}
});
