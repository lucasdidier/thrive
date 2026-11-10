// A 402 from any API call means the trial or subscription ended (server/subscription.mjs): raise
// thrive:locked so the lock screen appears (subscription-ui.js).
// Establish the account before reading any browser recovery data. A workspace
// opened before a different sign-in must never write into that new account.
export async function loadAccount(){const response=await fetch('/api/auth',{cache:'no-store'});if(!response.ok)throw Error('Account service unavailable. Reload to try again.');const account=await response.json();if(account.enabled&&!account.user){location.replace('/auth/sign-in');throw Error('Sign in to continue.');}
 account.workspaceId=new URL(location.href).searchParams.get('workspace')||'default';
 const original=window.fetch.bind(window);window.fetch=(input,options={})=>{const url=new URL(input instanceof Request?input.url:input,location.href);if(url.origin===location.origin&&url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/api/auth')&&!url.pathname.startsWith('/api/shared/')){const headers=new Headers(options.headers||(input instanceof Request?input.headers:undefined));if(account.enabled)headers.set('X-Thrive-Account',account.user.owner);headers.set('X-Thrive-Workspace',account.workspaceId);options={...options,headers};}const pending=original(input,options);if(url.origin===location.origin&&url.pathname.startsWith('/api/'))pending.then(r=>{if(r.status===402)dispatchEvent(new Event('thrive:locked'));},()=>{});return pending;};
 return account;
}
export async function signOut(){const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'signout'})});const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to sign out.');location.replace('/auth/sign-in');}
