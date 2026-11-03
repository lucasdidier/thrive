// Email and calendar share one provider grant and one connection lifecycle.
export function connectionSettings(connection,{esc,icon,btn,stamp}){
 const c=connection,a=c.account,provider=a?.provider==='microsoft'?'Microsoft':'Google',complete=!!(a?.gmail&&a?.calendar);
 const connect=(p,label,primary=false)=>btn(label,'mail-connect',`data-mode="all" data-provider="${p}" ${!c.configured?'disabled':''}`,primary?'primary':'subtle');
 const missing=!a||complete?'':!a.gmail&&!a.calendar?'Email and calendar':!a.gmail?'Email':'Calendar';
 const status=a?(complete?'Connected':'Needs attention'):'Not connected';
 const meta=a?[provider,missing?`${missing} access missing`:a.lastSync?'Synced '+esc(stamp(a.lastSync)):''].filter(Boolean).join(' · '):c.configured?'':'Not available yet';
 const actions=a?connect(a.provider==='microsoft'?'microsoft':'google','Reconnect',!complete)+btn('Disconnect','mail-disconnect-review','','subtle'):connect('google','Connect Google',true)+(c.provider==='nylas'?connect('microsoft','Connect Microsoft'):'');
 return `<section class="connected-account-card" aria-label="Email and calendar account"><span class="connected-account-symbol">${icon('mail')}</span><div class="connected-account-name"><h2>${a?esc(a.email):'Email & calendar'}</h2>${meta?`<p>${meta}</p>`:''}</div><span class="connection-state ${complete?'is-connected':a?'needs-attention':''}">${status}</span><div class="connected-account-actions">${actions}</div></section>`;
}
