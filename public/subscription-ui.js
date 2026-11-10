// Thrive Cloud plan in the browser: Settings › Plan & billing, the lock screen when the trial or the
// subscription has ended, and Paddle's checkout overlay. The Worker decides access (server/subscription.mjs);
// this only shows it. Self-hosted workspaces get {enabled:false} and none of it appears.
import {icon} from './app-icons.js';
import {featureIcon} from './feature-icon.js';
import {callout} from './callout.js';
import {formatDay} from './subscription-domain.js';
import {signOut} from './account.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const zone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch{return '';}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const day=iso=>formatDay(iso,zone()||'UTC').replace(/^\w+, /,'');
const btn=(text,action,extra='',cls='')=>`<button type="button" class="btn ${cls}" data-action="${action}" ${extra}>${text}</button>`;

export async function loadPlan(){
 try{const r=await fetch('/api/billing?tz='+encodeURIComponent(zone()),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)return null;const plan=await r.json();return plan?.enabled?plan:null;}
 catch{return null;}
}
async function billing(body){
 const r=await fetch('/api/billing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||'The billing service is unavailable. Please try again.');
 return data;
}

// Paddle.js loads on first use, never on every page view.
let paddle=null,onPaddleEvent=()=>{};
function loadPaddle(config){
 paddle??=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://cdn.paddle.com/paddle/v2/paddle.js';script.async=true;
  script.onload=()=>{try{if(config.sandbox)window.Paddle.Environment.set('sandbox');window.Paddle.Initialize({token:config.token,eventCallback:e=>onPaddleEvent(e)});resolve(window.Paddle);}catch(error){reject(error);}};
  script.onerror=()=>{paddle=null;script.remove();reject(Error('Checkout could not load. Check your connection and try again.'));};
  document.head.append(script);
 });
 return paddle;
}

const lockedTitle=access=>access.state==='ended'?'Your subscription has ended':'Your free trial has ended';

export function createSubscriptionUI({getPlan,setPlan,toast}){
 let busy=false;
 const plan=()=>getPlan();
 const status=text=>document.querySelectorAll('[data-plan-status]').forEach(el=>{el.textContent=text;el.hidden=!text;});
 const subscribeLabel=()=>`Subscribe${plan()?.price?` for ${plan().price}`:''}`;

 // The checkout reports success in the browser; the Worker checks it with Paddle before opening access.
 async function confirm(transactionId){
  status('Confirming your payment…');
  for(let attempt=0;attempt<20;attempt++){
   let next=null;
   try{next=transactionId?await billing({action:'confirm',transactionId}):await loadPlan();}catch{next=await loadPlan();}
   if(next&&!next.pending&&!next.access.locked&&!['trial','expired','ended'].includes(next.access.state)){status('Payment confirmed. Opening Thrive…');try{window.Paddle?.Checkout.close();}catch{}location.reload();return;}
   await sleep(attempt<5?1500:3000);
  }
  status('Payment received. It can take a minute to show here; reload the page in a moment.');
 }
 onPaddleEvent=e=>{if(e?.name==='checkout.completed')void confirm(e.data?.transaction_id);};

 async function subscribe(){
  const p=plan();
  if(!p?.paddle)throw Error(`Subscriptions aren’t open yet.${p?.support?` Write to ${p.support}.`:''}`);
  if(busy)return;busy=true;status('');
  try{
   const Paddle=await loadPaddle(p.paddle);
   Paddle.Checkout.open({items:[{priceId:p.paddle.priceId,quantity:1}],customer:p.email?{email:p.email}:undefined,customData:{thrive_owner:p.owner},settings:{displayMode:'overlay',theme:document.documentElement.dataset.theme==='dark'?'dark':'light'}});
  }finally{busy=false;}
 }

 // Paddle's customer portal opens in a new tab; its links expire, so each click asks for a fresh one.
 async function manage(kind){
  const tab=window.open('','_blank');
  try{const {url,payment}=await billing({action:'portal'}),target=kind==='payment'?payment:url;if(tab){tab.opener=null;tab.location.href=target;}else location.href=target;}
  catch(error){tab?.close();throw error;}
 }

 function settingsHTML(){
  const p=plan();if(!p)return '';
  const a=p.access,row=(title,meta,action='')=>`<div class="settings-security-row"><div><strong>${title}</strong>${meta?`<p>${meta}</p>`:''}</div>${action}</div>`;
  const subscribe=btn(icon('card')+esc(subscribeLabel()),'plan-subscribe','','primary'),portal=btn(icon('external')+'Manage billing','plan-portal');
  const plan_={
   trial:()=>row('Free trial',`Ends ${esc(day(a.trialEndsAt))} · ${a.lastDay?'last day':`${a.daysLeft} day${a.daysLeft===1?'':'s'} left`}`,subscribe),
   active:()=>row('Thrive Cloud',[p.price,a.renewsAt?`Renews ${day(a.renewsAt)}`:''].filter(Boolean).map(esc).join(' · '),portal),
   canceling:()=>row('Thrive Cloud',`Ends ${esc(day(a.endsAt))}`,portal),
   past_due:()=>callout({title:'Your last payment failed',tone:'negative',role:'alert',body:'<p>Update your payment method to keep using Thrive.</p>'})+row('Thrive Cloud',esc(p.price||''),btn(icon('card')+'Update payment method','plan-payment','','primary')),
   comped:()=>row('Thrive Cloud','Free access'),
   expired:()=>row(lockedTitle(a),'',subscribe),
   ended:()=>row(lockedTitle(a),'',subscribe),
  }[a.state]?.()||'';
  const card=(title,body)=>`<section class="settings-card"><header><h2>${title}</h2></header><div class="settings-card-body">${body}</div></section>`;
  return card('Plan',`${plan_}<p class="plan-status" data-plan-status role="status" hidden></p>`)
   +card('Your data',row('All workspaces',`JSON export`,`<a class="btn" href="/api/billing?export" download>${icon('download')}Download</a>`));
 }

 async function mount(){
  const host=document.querySelector('#plan-settings');if(!host)return;
  const fresh=await loadPlan();if(fresh)setPlan(fresh);
  if(host.isConnected)host.outerHTML=plan()?settingsHTML():'<p class="form-error">Plan details could not be loaded.</p>';
 }

 // Locked: the workspace stays closed until a subscription is active. Export and sign-out still work.
 function showPaywall(p=plan()){
  if(!p||document.querySelector('.paywall'))return;
  setPlan(p);
  const a=p.access,page=document.createElement('div');
  page.className='paywall';page.setAttribute('role','dialog');page.setAttribute('aria-modal','true');page.setAttribute('aria-labelledby','paywall-title');
  page.innerHTML=`<div class="paywall-card"><a class="paywall-brand" href="/" aria-label="Thrive"><img src="/favicon.svg" alt="" width="24" height="24">thrive</a>${featureIcon('lock','lg')}<h1 id="paywall-title">${esc(lockedTitle(a))}</h1><p>Your workspace is saved. Subscribe to pick up where you left off.</p>${btn(icon('card')+esc(subscribeLabel()),'plan-subscribe','','primary')}<p class="plan-status" data-plan-status role="status" hidden></p><div class="paywall-links"><a class="btn subtle" href="/api/billing?export" download>${icon('download')}Download your data</a><button type="button" class="btn subtle" data-action="plan-signout">${icon('logout')}Sign out</button></div>${p.support?`<p class="paywall-help">Questions? <a href="mailto:${esc(p.support)}">${esc(p.support)}</a></p>`:''}</div>`;
  // Its own listener: at sign-in the app never starts behind a locked plan, so nothing else handles clicks.
  page.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el)return;e.stopPropagation();click(el.dataset.action);});
  for(const el of document.body.children)if(el!==page&&!el.matches('script,#toast'))el.inert=true;
  document.body.append(page);document.body.dataset.locked='true';
  page.querySelector('[data-action=plan-subscribe]').focus();
 }

 const actions={'plan-subscribe':subscribe,'plan-portal':()=>manage('overview'),'plan-payment':()=>manage('payment'),'plan-signout':signOut};
 // Synchronous for the app's click chain: true when the action is a plan action.
 function click(action){
  const run=actions[action];if(!run)return false;
  Promise.resolve().then(run).catch(error=>{if(document.querySelector('.paywall'))status(error.message);else toast?.(error.message);});
  return true;
 }
 // Any request answering 402 means access ended while the app was open (account.js raises the event).
 addEventListener('thrive:locked',async()=>{const p=await loadPlan();if(p?.access.locked)showPaywall(p);});
 return {mount,showPaywall,click,settingsHTML};
}
