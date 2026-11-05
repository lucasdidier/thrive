const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const wait=ms=>new Promise(r=>setTimeout(r,reduce.matches?0:ms));
$('#year').textContent=new Date().getFullYear();
if(new URLSearchParams(location.search).get('access')==='pending'){$('#pending').hidden=false;history.replaceState(null,'','/');}

// ---- Tabs: the product tour and the client pages. Arrow keys move between them. ----
function tabs(list,{vertical=false,onShow=()=>{}}={}){
 const all=[...list.querySelectorAll('[role=tab]')];
 const show=(tab,focus)=>{all.forEach(t=>{const on=t===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!on;});if(focus)tab.focus();onShow(tab);};
 const keys=vertical?{ArrowDown:1,ArrowUp:-1,ArrowRight:1,ArrowLeft:-1}:{ArrowRight:1,ArrowLeft:-1};
 all.forEach((t,i)=>{
  t.addEventListener('click',()=>show(t));
  t.addEventListener('keydown',e=>{const n=keys[e.key];if(n){e.preventDefault();show(all[(i+n+all.length)%all.length],true);}if(e.key==='Home'){e.preventDefault();show(all[0],true);}if(e.key==='End'){e.preventDefault();show(all.at(-1),true);}});
 });
}
// The recorded clip plays only while its tab shows, and never with reduced motion.
tabs($('.pills'),{onShow:()=>$$('.tour-panel video').forEach(v=>{if(!v.closest('.tour-panel').hidden&&!reduce.matches)v.play().catch(()=>{});else v.pause();})});
tabs($('.doc-cards'),{vertical:true});

// ---- The AI assistant: pick a prompt, watch it work. ----
// Scripted replies on fictional data. Tool names are Thrive's real MCP tools and actions.
{
 const rows=(...r)=>`<table>${r.map(([a,b,c])=>`<tr><td>${a}</td><td>${b}</td><td class="late">${c}</td></tr>`).join('')}</table>`;
 const choice=(a,b)=>`<span class="choice" aria-hidden="true"><span>${a}</span><span>${b}</span></span>`;
 const replies={
  overdue:[['thrive_list_records','invoices · overdue'],`Two are overdue:${rows(['INV-004 · Juniper Studio','€1,800.00','21 days'],['INV-005 · Orbit','€3,000.00','12 days'])}`,['thrive_execute_action','emailDraft.create × 2 · not sent'],'Both reminders are saved as drafts in Emails. Nothing has been sent. Review them and send when you’re happy.'],
  free:[['thrive_calendar_availability','Fri, Nov 6 · 12:00–18:00'],'Your whole Friday afternoon is free. The only meetings that day are in the morning:<ul><li><b>9:30</b>Discovery call · Northstar Labs</li><li><b>11:00</b>Packaging workshop · Ember Coffee</li></ul>Want me to draft a hold for 14:00–16:00? Nothing is booked until you say so.'],
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
 [['#tour .sec-head > *','.pills','.tour-panels'],['#ai .sec-head > *','.console','.promises li'],['.out-index > *','.out-stage'],['.faq-head > *','.faq-list'],['.claim-inner > *']].forEach(g=>rise(g.flatMap(s=>$$(s))));
 addEventListener('scroll',()=>requestAnimationFrame(due),{passive:true});
}

// ---- Claim a free spot ----
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
  button.disabled=true;button.textContent='Saving…';
  try{
   const r=await fetch('/api/beta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
   const body=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(body.error||'That didn’t go through. Please try again.');
   form.hidden=true;done.hidden=false;done.focus();
  }catch(e){error.textContent=e.message;}
  finally{button.disabled=false;button.textContent='Claim my spot';}
 });
}
