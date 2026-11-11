// The sign-in pages load without boot.js, so pick the language here before drawing anything.
import {L,setLanguage,startLanguage} from './i18n.js';
// ?lang=fr from the site (landing page or blog in that language) picks the language for this browser.
await setLanguage(startLanguage(new URLSearchParams(location.search).get('lang')));
const $=id=>document.getElementById(id),esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view=location.pathname.split('/').at(-1),params=new URLSearchParams(location.search);let config,busy=false,lastEmail='',resendTimer;
const google='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"/></svg>';
const microsoft='<svg viewBox="0 0 20 20" aria-hidden="true" fill="currentColor"><path d="M1 1h8v8H1zM11 1h8v8h-8zM1 11h8v8H1zM11 11h8v8h-8z"/></svg>';
const arrow='<svg class="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
function emailField(){return `<div class="field"><label for="email">${L('Email')}</label><input id="email" name="email" type="email" autocomplete="email" placeholder="${esc(L('you@company.com'))}" required maxlength="254"></div>`;}
function passwordField(forgot=false){return `<div class="field"><div class="field-head"><label for="password">${L('Password')}</label>${forgot?`<a href="/auth/forgot-password">${L('Forgot password?')}</a>`:''}</div><div class="password"><input id="password" name="password" type="password" autocomplete="${forgot?'current-password':'new-password'}" ${forgot?'':`minlength="12" placeholder="${esc(L('At least 12 characters'))}"`} maxlength="128" required><button id="show-password" type="button" aria-label="${esc(L('Show password'))}">${L('Show')}</button></div></div>`;}
// Footer links: the sentence is translated whole, with the link text inside it.
const notInvited=()=>L('Not invited yet? {link}',{link:`<a href="/#request">${L('Request access')}</a>`});
const haveAccount=()=>L('Already have an account? {link}',{link:`<a href="/auth/sign-in">${L('Sign in')}</a>`});
const newToThrive=()=>L('New to Thrive? {link}',{link:`<a href="/auth/sign-up">${L('Create an account')}</a>`});
const backToSignIn=()=>`<a href="/auth/sign-in">${L('Back to sign in')}</a>`;
function heading(title,subtitle=''){$('heading').textContent=title;$('subtitle').textContent=subtitle;$('subtitle').hidden=!subtitle;document.title=L('{title} — Thrive',{title});}
function notice(text){$('notice').textContent=text;$('notice').hidden=!text;}
function showError(message){$('error').textContent=message||'';}
function controls(){document.querySelectorAll('#content button,#content input').forEach(el=>el.disabled=busy||!config?.enabled||(el.dataset.provider&&!config.providers[el.dataset.provider])||(el.id==='resend'&&!!resendTimer));}
async function action(body){if(busy)return;busy=true;showError('');controls();try{const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params.get('next')?{...body,next:params.get('next')}:body)});const result=await response.json();if(!response.ok)throw Error(result.error||L('Please try again.'));if(result.redirect){location.assign(result.redirect);return;}return result;}catch(error){showError(error.message);}finally{busy=false;controls();}}
function googleButtons(){document.querySelectorAll('[data-provider]').forEach(button=>button.onclick=()=>action({action:'oauth',provider:button.dataset.provider}));}

// Invite-only beta: Google, or a one-time code sent to an invited email.
function codeSignIn(){
 clearInterval(resendTimer);resendTimer=undefined;notice('');
 const joining=config.openSignup&&view==='sign-up';
 heading(joining?L('Create your Thrive account'):L('Sign in to Thrive'),joining?L('No password needed. Your account is created when you first sign in.'):'');
 $('content').innerHTML=`<button class="btn" type="button" data-provider="google">${google}${L('Continue with Google')}</button><div class="divider">${L('or')}</div><form id="code-form" class="stack" novalidate><label class="sr-only" for="email">${L('Email')}</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="${esc(L('Email'))}" required maxlength="254" value="${esc(lastEmail)}"><button class="btn primary" type="submit">${L('Email me a code')}${arrow}</button></form>`;
 $('footer').innerHTML=config.inviteOnly?notInvited():joining?haveAccount():newToThrive();
 googleButtons();
 $('code-form').onsubmit=async event=>{event.preventDefault();const email=$('email').value.trim();if(!$('email').checkValidity()||!email){showError(L('Enter a valid email address.'));$('email').focus();return;}lastEmail=email;if((await action({action:'email-code',email}))?.sent)codeStep();};
 controls();
}
function startResendTimer(){let left=60;const tick=()=>{const button=$('resend');if(!button){clearInterval(resendTimer);resendTimer=undefined;return;}if(left<=0){clearInterval(resendTimer);resendTimer=undefined;button.textContent=L('Resend code');controls();return;}button.textContent=L('Resend code in {seconds}s',{seconds:left--});};clearInterval(resendTimer);resendTimer=setInterval(tick,1000);tick();controls();}
function codeStep(){
 heading(L('Check your email'),L('We sent a sign-in code to {email}. It expires in an hour.',{email:lastEmail}));
 $('content').innerHTML=`<form id="verify-form" class="stack" novalidate><label class="sr-only" for="code">${L('Sign-in code')}</label><input id="code" name="code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="12" placeholder="${esc(L('Enter code'))}" required spellcheck="false"><button class="btn primary" type="submit">${L('Sign in')}${arrow}</button></form><div class="code-links"><button type="button" class="link" id="resend">${L('Resend code')}</button><button type="button" class="link" id="other-email">${L('Use another email')}</button></div>`;
 $('footer').textContent=L('Can’t find it? Check spam, or open the link in the same email on this device.');
 $('verify-form').onsubmit=async event=>{event.preventDefault();const code=$('code').value.replace(/\s+/g,'');if(!/^\d{6,10}$/.test(code)){showError(L('Enter the code from your email.'));$('code').focus();return;}await action({action:'verify-code',email:lastEmail,code});};
 $('code').oninput=event=>{event.target.value=event.target.value.replace(/[^\d\s]/g,'');};
 $('resend').onclick=async()=>{if((await action({action:'email-code',email:lastEmail}))?.sent){notice(L('A new code is on its way.'));startResendTimer();}};
 $('other-email').onclick=()=>{showError('');codeSignIn();$('email').focus();};
 startResendTimer();$('code').focus();
}

function render(){
 if(config.emailCode){codeSignIn();return;}
 if(config.ownerOnly||config.inviteOnly){heading(L('Sign in to Thrive'),config.inviteOnly?L('Thrive is in private beta. Continue with your invited Google account.'):L('This workspace is private. Continue with your authorized Google account.'));$('content').innerHTML=`<button class="btn" data-provider="google">${google}${L('Continue with Google')}</button>`;$('footer').innerHTML=config.inviteOnly?notInvited():esc(L('New account registration is closed.'));googleButtons();controls();return;}

 if(view==='confirm'){heading(L('Confirm your email'),L('Continue to your Thrive account.'));$('content').innerHTML=`<button class="btn primary" id="confirm">${L('Continue')}</button>`;$('confirm').onclick=()=>action({action:'confirm',token_hash:params.get('token_hash'),type:params.get('type')});$('footer').innerHTML=backToSignIn();controls();return;}
 const signup=view==='sign-up',reset=view==='reset-password',forgot=view==='forgot-password';
 heading(signup?L('Create your account'):reset?L('Set a new password'):forgot?L('Reset your password'):L('Sign in to Thrive'),signup?L('Start with your own workspace.'):reset?L('Choose a password for your account.'):forgot?L('We’ll email you a reset link.'):'');
 $('content').innerHTML=`${!forgot&&!reset?`<div class="stack"><button class="btn" data-provider="google">${google}${L('Continue with Google')}</button>${config.providers?.microsoft?`<button class="btn" data-provider="microsoft">${microsoft}${L('Continue with Microsoft')}</button>`:''}</div><div class="divider">${L('or')}</div>`:''}<form id="auth-form">${signup?`<div class="field"><label for="name">${L('Your name')}</label><input id="name" name="name" autocomplete="name" required maxlength="80" placeholder="Alex Morgan"></div><div class="field"><label for="business">${L('Business name')}</label><input id="business" name="business" autocomplete="organization" maxlength="80" placeholder="${esc(L('Your business'))}"></div>`:''}${reset?'':emailField()}${forgot?'':passwordField(!signup&&!reset)}<button type="submit" class="btn primary">${signup?L('Create account'):reset?L('Save password'):forgot?L('Send reset link'):L('Sign in')}</button></form>`;
 $('footer').innerHTML=signup?haveAccount():forgot||reset?backToSignIn():newToThrive();
 $('show-password')?.addEventListener('click',()=>{const show=$('password').type==='password';$('password').type=show?'text':'password';$('show-password').textContent=show?L('Hide'):L('Show');$('show-password').setAttribute('aria-label',show?L('Hide password'):L('Show password'));});
 googleButtons();
 $('auth-form').onsubmit=async event=>{event.preventDefault();const fields=Object.fromEntries(new FormData(event.target));lastEmail=fields.email||'';const result=await action({...fields,action:signup?'signup':reset?'reset':forgot?'forgot':'signin'});if(result?.confirmation){heading(L('Check your email'),L('Confirm your email to open your workspace.'));notice(L('We sent a confirmation link to {email}.',{email:lastEmail}));$('content').innerHTML=`<div class="stack"><button class="btn" id="resend-confirmation">${L('Resend confirmation email')}</button><a class="btn" href="/auth/sign-in">${L('Back to sign in')}</a></div>`;$('resend-confirmation').onclick=async()=>{const response=await action({action:'resend',email:lastEmail});if(response)notice(response.message);};}else if(result?.message)notice(result.message);};controls();
}
try{const response=await fetch('/api/auth',{cache:'no-store'});if(!response.ok)throw Error(L('The account service is unavailable. Please try again later.'));config=await response.json();render();if(!config.enabled){notice(L('Account signup is not open yet.'));const link=document.createElement('a');link.href='/';link.textContent=L('Continue to the preview');$('notice').append(document.createElement('br'),link);}if(params.get('error')==='link')showError(L('This sign-in link could not be verified. It may have expired or been opened in another browser. Ask for a new code.'));}catch(error){heading(L('Account service unavailable'),L('Please try again later.'));showError(error.message);$('footer').innerHTML=`<a href="/">${L('Return to Thrive')}</a>`;}
