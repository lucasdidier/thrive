import {mountMiniApp,mountClientPages} from '/landing-app.js';
import {mountPhoneApp} from '/landing-phone.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
const wait=ms=>new Promise(r=>setTimeout(r,reduce.matches?0:ms));
$('#year').textContent=new Date().getFullYear();
if(new URLSearchParams(location.search).get('access')==='pending'){$('#pending').hidden=false;history.replaceState(null,'','/');}

// ---- Tabs: the hero switcher and the client pages. Arrow keys move between them. ----
function tabs(list,{vertical=false,onShow=()=>{}}={}){
 const all=[...list.querySelectorAll('[role=tab]')];
 const show=(tab,focus)=>{all.forEach(t=>{const on=t===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!on;});if(focus)tab.focus();onShow(tab,all.indexOf(tab));};
 const keys=vertical?{ArrowDown:1,ArrowUp:-1,ArrowRight:1,ArrowLeft:-1}:{ArrowRight:1,ArrowLeft:-1};
 all.forEach((t,i)=>{
  t.addEventListener('click',()=>show(t));
  t.addEventListener('keydown',e=>{const n=keys[e.key];if(n){e.preventDefault();show(all[(i+n+all.length)%all.length],true);}if(e.key==='Home'){e.preventDefault();show(all[0],true);}if(e.key==='End'){e.preventDefault();show(all.at(-1),true);}});
 });
 return {show:i=>show(all[i])};
}
// What clients see: the same kind of live page, one per card.
{
 const root=$('#client-mini'),url=$('#client-url'),cards=$$('.doc-cards [role=tab]');
 const docTabs=tabs($('.doc-cards'),{vertical:true,onShow:(tab,i)=>{url.textContent=document.getElementById(tab.getAttribute('aria-controls')).dataset.url;}});
 const pages=mountClientPages(root,{
  onNavigate:doc=>docTabs.show(cards.findIndex(c=>c.id===`o-${doc}`)),
 });
 new IntersectionObserver(([e])=>pages.setInView(e.isIntersecting),{threshold:.2}).observe(root);
}

// ---- Coming soon: the mobile app. Its screens advance on their own until the visitor taps, and the
// timer only runs while the phone is on screen. ----
{
 const root=$('#phone'),section=$('#mobile'),phone=mountPhoneApp(root);
 new IntersectionObserver(([e])=>{phone.setInView(e.isIntersecting);section.classList.toggle('in-view',e.isIntersecting);},{threshold:.3}).observe(root);
}

// ---- Hero: a lighter, clickable Thrive. Each tab opens one view of it, and the app's own sidebar
// moves between the same views. Until the visitor touches anything, views advance on their own and
// the active tab fills a line; that pauses while the pointer is on the app or the hero is off screen,
// and never starts with reduced motion. ----
{
 const switcher=$('.switch'),buttons=$$('.switch [role=tab]'),panels=buttons.map(b=>document.getElementById(b.getAttribute('aria-controls')));
 const url=$('#mini-url'),root=$('#mini'),frame=root.closest('.browser');
 const mini=mountMiniApp(root,{onNavigate:id=>{stopAuto();strip.show(buttons.findIndex(b=>b.id===`t-${id}`));}});
 const STEP=7000;let auto=!reduce.matches,inView=true,hovering=false,elapsed=0,last=0,frameId=0,current=0;
 const strip=tabs(switcher,{onShow:(tab,i)=>{
  current=i;elapsed=0;buttons.forEach(b=>b.style.setProperty('--p',0));
  url.textContent=panels[i].dataset.url;mini.show(tab.id.slice(2));
  if(switcher.scrollWidth>switcher.clientWidth)switcher.scrollTo({left:tab.offsetLeft-(switcher.clientWidth-tab.offsetWidth)/2,behavior:reduce.matches?'auto':'smooth'});
 }});
 function stopAuto(){auto=false;cancelAnimationFrame(frameId);switcher.classList.remove('is-playing');buttons.forEach(b=>b.style.setProperty('--p',0));}
 const tick=now=>{
  if(!auto)return;
  const live=inView&&!hovering&&!document.hidden;
  if(live&&last)elapsed+=now-last;last=live?now:0;
  buttons[current].style.setProperty('--p',Math.min(1,elapsed/STEP).toFixed(4));
  if(elapsed>=STEP)strip.show((current+1)%buttons.length);
  frameId=requestAnimationFrame(tick);
 };
 // Any real interaction hands control to the visitor.
 buttons.forEach(b=>b.addEventListener('click',e=>{if(e.isTrusted)stopAuto();}));
 switcher.addEventListener('keydown',stopAuto);
 root.addEventListener('pointerdown',stopAuto);root.addEventListener('keydown',stopAuto);
 frame.addEventListener('pointerenter',()=>{hovering=true;});frame.addEventListener('pointerleave',()=>{hovering=false;});
 new IntersectionObserver(([e])=>{inView=e.isIntersecting;mini.setInView(inView);},{threshold:.2}).observe(root);
 mini.show('home');
 if(auto){switcher.classList.add('is-playing');frameId=requestAnimationFrame(tick);}
}

// ---- Feature cards: each moment plays while the pointer is on its card, or while the card is
// on screen when there's no hover. The running timer ticks only then. ----
{
 const cards=$$('.feat');
 const set=(card,on)=>card.classList.toggle('on',on&&!reduce.matches);
 cards.forEach(card=>{
  card.addEventListener('pointerenter',()=>{if(finePointer.matches)set(card,true);});
  card.addEventListener('pointerleave',()=>{if(finePointer.matches)set(card,false);});
 });
 const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(!finePointer.matches)set(e.target,e.isIntersecting);}),{threshold:.55});
 // Each moment starts by resetting to its "before"; hold every card at its finished height so the
 // page below never shifts while one plays.
 const hold=()=>cards.forEach(card=>{const demo=card.querySelector('.demo'),on=card.classList.contains('on');card.classList.remove('on');demo.style.minHeight='';demo.style.minHeight=`${demo.offsetHeight}px`;card.classList.toggle('on',on);});
 hold();addEventListener('resize',()=>requestAnimationFrame(hold));document.fonts?.ready.then(hold);
 cards.forEach(c=>io.observe(c));
 const clock=$('.feat [data-clock]');
 if(clock){
  let s=Number(clock.dataset.clock);const card=clock.closest('.feat');
  const pad=n=>String(n).padStart(2,'0');
  setInterval(()=>{if(!card.classList.contains('on'))return;s++;clock.textContent=`${pad(Math.floor(s/3600))}:${pad(Math.floor(s/60)%60)}:${pad(s%60)}`;},1000);
 }
}

// ---- What each assistant can do: the line changes every few seconds until the visitor picks one. ----
{
 const picks=$$('.agents button'),lines=$$('.says li'),head=$('.ai-head');
 let i=0,timer=0,hover=false;
 const show=n=>{i=n;picks.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===n)));lines.forEach((l,j)=>l.classList.toggle('on',j===n));};
 const stop=()=>{clearInterval(timer);timer=0;};
 picks.forEach((b,n)=>b.addEventListener('click',()=>{stop();show(n);}));
 head.addEventListener('pointerenter',()=>{hover=true;});head.addEventListener('pointerleave',()=>{hover=false;});
 if(!reduce.matches){
  timer=setInterval(()=>{if(!hover&&!document.hidden)show((i+1)%lines.length);},3200);
 }
}

// ---- The AI assistant: pick a prompt, watch it work. ----
// Scripted replies on fictional data. Tool names are Thrive's real MCP tools and actions.
{
 const rows=(...r)=>`<table>${r.map(([a,b,c])=>`<tr><td>${a}</td><td>${b}</td><td class="late">${c}</td></tr>`).join('')}</table>`;
 const choice=(a,b)=>`<span class="choice" aria-hidden="true"><span>${a}</span><span>${b}</span></span>`;
 const replies={
  overdue:[['thrive_list_records','invoices · overdue'],`Two are overdue:${rows(['INV-004 · Juniper Studio','€1,800.00','21 days'],['INV-005 · Orbit','€3,000.00','12 days'])}`,['thrive_execute_action','emailDraft.create × 2 · not sent'],'Both reminders are saved as drafts in Emails. Nothing has been sent. Review them and send when you’re happy.'],
  free:[['thrive_calendar_availability','Fri, Nov 13 · 12:00–18:00'],'Your whole Friday afternoon is free. The only meetings that day are in the morning:<ul><li><b>9:30</b>Discovery call · Northstar Labs</li><li><b>11:00</b>Packaging workshop · Ember Coffee</li></ul>Want me to draft a hold for 14:00–16:00? Nothing is booked until you say so.'],
  workflow:[['thrive_get_catalog','77 triggers · 43 actions'],['thrive_test_workflow','Juniper brand identity · nothing saved'],`Here’s the workflow: <b>Proposal accepted</b> → <b>Create contract draft</b>. Test passed: a contract draft would be created for Juniper Studio. Turn it on?${choice('Turn it on','Not now')}`],
  followup:[['thrive_list_records','meetings · today'],['thrive_execute_action','meeting.followup · draft'],'Done. I drafted a follow-up email to Priya Shah and a proposal for the Northstar Labs website. Both are waiting in Thrive for your review, and nothing was sent.'],
  import:[['thrive_preview_client_import','40 rows · nothing saved'],`38 clients are ready to import. 2 are already in Thrive, Orbit and Forma, and will be skipped. Import the 38?${choice('Import 38 clients','Review first')}`],
  paid:[['thrive_list_records','payments · November'],['thrive_preview_action','client.add_tag × 3 · not saved'],`Three clients paid this month: Orbit, Juniper Studio and Forma. I checked adding the tag “Paid” to each on a copy of your workspace. Apply it?${choice('Apply the tag','Not now')}`],
 };
 const consoleEl=$('.console'),thread=$('.thread'),composer=$('.composer'),composerText=$('.composer-text'),asks=$$('[data-ask]');
 const idle=composerText.textContent;
 let busy=false;
 const scroll=()=>{thread.scrollTop=thread.scrollHeight;};
 function add(html,cls,tag='p'){const el=document.createElement(tag);el.className=`${cls} new`;el.innerHTML=html;thread.append(el);scroll();return el;}
 const call=([name,out])=>`<span class="state" aria-hidden="true"></span><code>${name}</code><span class="out">${out}</span>`;
 async function send(button){
  if(busy)return;busy=true;
  const steps=replies[button.dataset.ask];
  asks.forEach(b=>b.setAttribute('aria-disabled','true'));consoleEl.classList.add('busy');
  composerText.textContent=button.textContent;composer.classList.add('filled');
  await wait(450);
  composerText.textContent=idle;composer.classList.remove('filled');
  add(button.textContent,'msg you');
  for(const step of steps){
   await wait(350);
   if(Array.isArray(step)){const row=add(call(step),'call busy');await wait(750);row.classList.remove('busy');}
   else{const typing=add('<span class="typing" aria-label="Typing"><i></i><i></i><i></i></span>','msg bot','div');await wait(700);typing.innerHTML=step;scroll();}
  }
  button.classList.add('sent');
  asks.forEach(b=>b.removeAttribute('aria-disabled'));consoleEl.classList.remove('busy');busy=false;
 }
 asks.forEach(b=>b.addEventListener('click',()=>{
  if(b.getAttribute('aria-disabled')==='true')return;
  // On narrow screens the prompts sit above the chat; bring the answer into view.
  const r=thread.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)thread.scrollIntoView({block:'nearest',behavior:reduce.matches?'auto':'smooth'});
  send(b);
 }));
}

// ---- Copy the MCP address ----
$$('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(b.dataset.copy);b.textContent='Copied';}catch{b.textContent='Select and copy';}
 setTimeout(()=>{b.textContent='Copy';},1600);
}));

// ---- Entrances: heading, then text, then picture. Revealed by scroll position, so a jump
// link past a section never leaves it hidden. With reduced motion nothing is hidden. ----
if(!reduce.matches){
 const pending=new Set();
 const due=()=>{for(const el of pending)if(el.getBoundingClientRect().top<innerHeight*.92){el.classList.add('in');pending.delete(el);}};
 const rise=els=>els.forEach((el,i)=>{if(el.getBoundingClientRect().top<innerHeight)return;el.classList.add('rise');el.style.setProperty('--d',`${Math.min(i,4)*80}ms`);pending.add(el);});
 [['#features-title'],['.bento .feat:nth-child(-n+2)'],['.bento .feat:nth-child(n+3):nth-child(-n+4)'],['.bento .feat:nth-child(n+5):nth-child(-n+6)'],['.bento .feat:nth-child(n+7):nth-child(-n+8)'],['.bento .feat:nth-child(n+9)'],['.ai-head > *','.console','.promises li'],['.out-index > *','.out-stage'],['.mobile-text > *','.mobile-stage'],['#pricing .center-head > *','.plans','.wide-checks'],['.faq-head > *','.faq-list'],['.claim-inner > *']].forEach(g=>rise(g.flatMap(s=>$$(s))));
 addEventListener('scroll',()=>requestAnimationFrame(due),{passive:true});
}

// ---- Appearance: system, light or dark, saved like the app's own setting. ----
{
 const choices=$$('[data-theme-choice]');
 const mark=()=>{const now=window.thriveTheme?.get()||'system';choices.forEach(b=>{const on=b.dataset.themeChoice===now;b.setAttribute('aria-checked',String(on));b.tabIndex=on?0:-1;});};
 choices.forEach((b,i)=>{
  b.addEventListener('click',()=>{window.thriveTheme?.set(b.dataset.themeChoice);mark();});
  b.addEventListener('keydown',e=>{const d={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];if(d){e.preventDefault();const n=choices[(i+d+choices.length)%choices.length];n.click();n.focus();}});
 });
 mark();
}

// ---- Request access: until open sign-up and the trial exist, "Start free trial" lands here. ----
{
 if(location.hash==='#request')$('#c-name')?.focus({preventScroll:true});
 const form=$('#request-form'),done=$('.done');
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const error=form.querySelector('.error'),button=form.querySelector('button');
  const data=Object.fromEntries(new FormData(form));
  error.textContent='';
  if(!data.name.trim()){error.textContent='Enter your name.';$('#c-name').focus();return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())){error.textContent='Enter a valid email address.';$('#c-email').focus();return;}
  button.disabled=true;button.textContent='Sending…';
  try{
   const r=await fetch('/api/beta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
   const body=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(body.error||'That didn’t go through. Please try again.');
   form.hidden=true;done.hidden=false;done.focus();
  }catch(e){error.textContent=e.message;}
  finally{button.disabled=false;button.textContent='Request access';}
 });
}
