// Email and calendar share one provider grant and one connection lifecycle.
// A workspace connects one account, Google or Microsoft; switching provider means disconnecting first.
const logos={
 google:'<svg class="provider-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
 microsoft:'<svg class="provider-logo" viewBox="0 0 21 21" aria-hidden="true"><path fill="#F25022" d="M1 1h9v9H1z"/><path fill="#7FBA00" d="M11 1h9v9h-9z"/><path fill="#00A4EF" d="M1 11h9v9H1z"/><path fill="#FFB900" d="M11 11h9v9h-9z"/></svg>'
};
const names={google:'Google',microsoft:'Microsoft'};
const accountProvider=a=>a?.provider==='microsoft'?'microsoft':'google';
export const providerLogo=p=>logos[p]||'';
const PAID_TITLE='Email & calendar sync come with a paid plan';

// Connect actions for whatever state the connection is in: both providers when nothing is
// connected (Microsoft only through Nylas), otherwise a reconnect for the account already linked.
// On a Thrive Cloud trial (requiresPlan) connecting waits for a paid plan, so it leads to Plan & billing.
export function connectActions(connection,btn,{primaryReconnect=false}={}){
 const c=connection||{},a=c.account,off=c.configured?'':'disabled';
 if(c.requiresPlan&&!a)return btn('See plans','plan-open','','primary');
 const connect=(p,label,cls='provider-connect')=>btn(logos[p]+label,'mail-connect',`data-mode="all" data-provider="${p}" ${off}`,cls);
 if(a)return connect(accountProvider(a),'Reconnect',primaryReconnect?'provider-connect primary':'provider-connect');
 return (c.provider==='nylas'?['google','microsoft']:['google']).map(p=>connect(p,'Connect with '+names[p])).join('');
}

// Shared not-connected prompt for Emails, Scheduling and client email history.
export function connectPrompt(connection,{title,iconName,icon,btn,className=''}){
 const a=connection?.account;
 return `<div class="messages-connection connect-prompt ${className}" role="status">${icon(iconName)}<span class="connect-prompt-body"><strong>${a?'Reconnect '+names[accountProvider(a)]:connection?.requiresPlan?PAID_TITLE:title}</strong><span class="connect-actions">${connectActions(connection,btn)}</span></span></div>`;
}

export function connectionSettings(connection,{esc,icon,btn,stamp}){
 const c=connection,a=c.account,provider=names[accountProvider(a)],complete=!!(a?.gmail&&a?.calendar);
 const missing=!a||complete?'':!a.gmail&&!a.calendar?'Email and calendar':!a.gmail?'Email':'Calendar';
 const status=a?(complete?'Connected':'Needs attention'):'Not connected';
 const meta=a?[provider,missing?`${missing} access missing`:a.lastSync?'Synced '+esc(stamp(a.lastSync)):''].filter(Boolean).join(' · '):c.requiresPlan?'Included with a paid plan':c.configured?'':'Not available yet';
 const actions=(a&&complete?'':connectActions(c,btn,{primaryReconnect:!!a}))+(a?btn('Disconnect','mail-disconnect-review','','subtle'):'');
 return `<section class="connected-account-card" aria-label="Email and calendar account"><span class="connected-account-symbol">${a?logos[accountProvider(a)]:icon('mail')}</span><div class="connected-account-name"><h2>${a?esc(a.email):'Email & calendar'}</h2>${meta?`<p>${meta}</p>`:''}</div><span class="connection-state ${complete?'is-connected':a?'needs-attention':''}">${complete?icon('check'):''}${status}</span><div class="connected-account-actions">${actions}</div></section>`;
}
