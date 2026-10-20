import {activityFeed,activityKey,isRead,timelineHTML} from './activity-feed.js';
export function createNotificationsUI({getState:S,getPage,render,save,open,btn,icon,esc,toast}){
 let threads=[],loaded=false,checked=false,loading=false,error='';
 const refresh=()=>{if(['overview','notifications'].includes(getPage()))render();};
 const rows=()=>activityFeed(S(),threads,true);
 async function api(body){const r=await fetch('/api/communications',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(body?90000:15000)}),v=await r.json();if(!r.ok)throw Error(v.error||'Email updates unavailable.');return v;}
 async function load(sync=true){if(loading)return;loading=true;if(sync)checked=true;error='';refresh();try{let data=await api();threads=data.threads||[];if(sync&&data.connection.account?.gmail){await api({action:'sync'});data=await api();threads=data.threads||[];}loaded=true;}catch(e){error=e.message;}finally{loading=false;refresh();}}
 setInterval(()=>{if(getPage()==='notifications'&&!loading)void load();},60000);
 function page(){if(!checked&&!loading&&!error)queueMicrotask(()=>load());return `<section class="notifications-page"><div class="feed-toolbar"><span>${rows().filter(n=>!isRead(S(),n)).length} unread</span><div>${btn('Refresh','notifications-refresh','',loading?'subtle':'')}${btn('Mark all read','notifications-read')}</div></div>${loading?'<p class="feed-status" role="status">Checking email updates…</p>':''}${error?`<p class="feed-status" role="alert">${esc(error)} ${btn('Try again','notifications-refresh')}</p>`:''}${timelineHTML(rows(),{esc,icon,state:S(),notifications:true,empty:'You’re up to date.'})}</section>`;}
 function recent(limit=4){if(!loaded&&!loading&&!error)queueMicrotask(()=>load(false));return timelineHTML(activityFeed(S(),threads).slice(0,limit),{esc,icon,state:S()});}
 function history(){open('Recent activity',`<div class="dialog-body">${timelineHTML(activityFeed(S(),threads),{esc,icon,state:S()})}</div>`);}
 function click(a){if(a==='notifications-inbox'){location.hash='notifications';return true;}if(a==='activity-inbox'){history();return true;}if(a==='notifications-refresh'){void load();return true;}if(a==='notifications-read'){const prior=S().settings.readNotifications||[];S().settings.readNotifications=[...new Set([...prior,...rows().map(activityKey)])];save();render();toast('Notifications marked as read.');return true;}return false;}
 return {page,recent,click};
}
