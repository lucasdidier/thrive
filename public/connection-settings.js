// Email and calendar share one provider grant and one connection lifecycle.
// A workspace connects one account, Google or Microsoft; switching provider means disconnecting first.
const logos={
 google:'<svg class="provider-logo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"/></svg>',
 microsoft:'<svg class="provider-logo" viewBox="0 0 21 21" aria-hidden="true"><path fill="#F25022" d="M1 1h9v9H1z"/><path fill="#7FBA00" d="M11 1h9v9h-9z"/><path fill="#00A4EF" d="M1 11h9v9H1z"/><path fill="#FFB900" d="M11 11h9v9h-9z"/></svg>'
};
const names={google:'Google',microsoft:'Microsoft'};
const accountProvider=a=>a?.provider==='microsoft'?'microsoft':'google';
export const providerLogo=p=>logos[p]||'';

// Connect actions for whatever state the connection is in: both providers when nothing is
// connected (Microsoft only through Nylas), otherwise a reconnect for the account already linked.
export function connectActions(connection,btn,{primaryReconnect=false}={}){
 const c=connection||{},a=c.account,off=c.configured?'':'disabled';
 const connect=(p,label,cls='provider-connect')=>btn(logos[p]+label,'mail-connect',`data-mode="all" data-provider="${p}" ${off}`,cls);
 if(a)return connect(accountProvider(a),'Reconnect',primaryReconnect?'provider-connect primary':'provider-connect');
 return (c.provider==='nylas'?['google','microsoft']:['google']).map(p=>connect(p,'Connect with '+names[p])).join('');
}

// Shared not-connected prompt for Emails, Scheduling and client email history.
export function connectPrompt(connection,{title,iconName,icon,btn,className=''}){
 const a=connection?.account;
 return `<div class="messages-connection connect-prompt ${className}" role="status">${icon(iconName)}<span class="connect-prompt-body"><strong>${a?'Reconnect '+names[accountProvider(a)]:title}</strong><span class="connect-actions">${connectActions(connection,btn)}</span></span></div>`;
}

export function connectionSettings(connection,{esc,icon,btn,stamp}){
 const c=connection,a=c.account,provider=names[accountProvider(a)],complete=!!(a?.gmail&&a?.calendar);
 const missing=!a||complete?'':!a.gmail&&!a.calendar?'Email and calendar':!a.gmail?'Email':'Calendar';
 const status=a?(complete?'Connected':'Needs attention'):'Not connected';
 const meta=a?[provider,missing?`${missing} access missing`:a.lastSync?'Synced '+esc(stamp(a.lastSync)):''].filter(Boolean).join(' · '):c.configured?'':'Not available yet';
 const actions=connectActions(c,btn,{primaryReconnect:!!a&&!complete})+(a?btn('Disconnect','mail-disconnect-review','','subtle'):'');
 return `<section class="connected-account-card" aria-label="Email and calendar account"><span class="connected-account-symbol">${a?logos[accountProvider(a)]:icon('mail')}</span><div class="connected-account-name"><h2>${a?esc(a.email):'Email & calendar'}</h2>${meta?`<p>${meta}</p>`:''}</div><span class="connection-state ${complete?'is-connected':a?'needs-attention':''}">${complete?icon('check'):''}${status}</span><div class="connected-account-actions">${actions}</div></section>`;
}
