// Basic product analytics: the pages people open and the buttons they press, by name only (data-action,
// form id), never text, values or record ids. Batched to /api/usage; the server ignores it unless
// THRIVE_ANALYTICS is on. See server/analytics.mjs.
const queue=[];let sent=0,lastPage='';
const LIMIT=400;
// "#clients/abc123" → "clients"; settings keep their section: "#settings/appearance" → "settings/appearance".
export function pageName(hash=globalThis.location?.hash||''){
 const parts=String(hash).replace(/^#/,'').split(/[/?]/).filter(Boolean);
 const first=(parts[0]||'overview').toLowerCase();
 return /^[a-z][a-z0-9-]{0,40}$/.test(first)?(first==='settings'&&/^[a-z][a-z-]{0,30}$/.test(parts[1]||'')?`settings/${parts[1]}`:first):'other';
}
export function track(event,detail=''){if(sent+queue.length>=LIMIT)return;queue.push({event,page:pageName(),detail:String(detail||'').slice(0,80)});if(queue.length>=25)flush();}
export function flush(){
 if(!queue.length)return;const events=queue.splice(0,30);sent+=events.length;
 try{fetch('/api/usage',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({events})}).catch(()=>{});}catch{}
}
function pageView(){const p=pageName();if(p!==lastPage){lastPage=p;track('page');}}
export function startAnalytics(){
 if(startAnalytics.started)return;startAnalytics.started=true;
 track('open',matchMedia('(max-width: 760px)').matches?'mobile':'desktop');pageView();
 addEventListener('hashchange',pageView);
 document.addEventListener('click',e=>{const el=e.target.closest?.('[data-action]');const a=el?.dataset.action;if(a&&/^[a-z0-9][a-z0-9_.-]*$/i.test(a))track('action',a);},true);
 document.addEventListener('submit',e=>{const id=e.target?.id;if(id&&/^[a-z0-9][a-z0-9_-]*$/i.test(id))track('submit',id);},true);
 setInterval(flush,20000);
 addEventListener('pagehide',flush);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
}
