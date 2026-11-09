// Google sign-in on Thrive's own domain. Google returns to <origin>/auth/google/callback, so the consent
// screen names Thrive's domain (and, once Google verifies the brand, "Thrive") instead of the Supabase
// project. The ID token is then handed to Supabase with signInWithIdToken, so sessions are unchanged.
// Without GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, sign-in keeps using Supabase's hosted redirect.
import {StoreError} from './store.mjs';

export const nativeGoogle=env=>!!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET);
export const googleCallbackURL=origin=>origin+'/auth/google/callback';
const COOKIE='thrive-google-oauth';
const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const random=()=>b64url(crypto.getRandomValues(new Uint8Array(32)));
const sha256=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
const hex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
const same=(a,b)=>{if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;};
const cookie=(origin,value,maxAge)=>`${COOKIE}=${value}; Path=/auth/google; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${origin.startsWith('https:')?'; Secure':''}`;
export const clearGoogleCookie=origin=>cookie(origin,'',0);
const failed=()=>new StoreError('The sign-in link could not be verified.');

// State (CSRF), PKCE verifier and the raw nonce live in a short-lived HttpOnly cookie scoped to the callback.
export async function startGoogleSignIn(env,origin){
 const state=random(),verifier=random(),nonce=random(),url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:googleCallbackURL(origin),response_type:'code',scope:'openid email profile',state,code_challenge:b64url(await sha256(verifier)),code_challenge_method:'S256',nonce:hex(await sha256(nonce)),prompt:'select_account'});
 return {url:url.href,cookie:cookie(origin,[state,verifier,nonce].join('.'),600)};
}

// Exchanges Google's code for an ID token and signs in to Supabase with it. Supabase checks the token's
// audience against its Google client IDs and the nonce against the hash Google signed.
export async function finishGoogleSignIn(request,env,auth,origin,fetcher=fetch){
 const url=new URL(request.url),code=url.searchParams.get('code'),state=url.searchParams.get('state')||'';
 const saved=(request.headers.get('cookie')||'').split(/;\s*/).find(c=>c.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
 const [expected='',verifier='',nonce='']=saved.split('.');
 if(!code||code.length>2048||url.searchParams.has('error')||!expected||!verifier||!nonce||!same(state,expected))throw failed();
 let body;try{const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:googleCallbackURL(origin),grant_type:'authorization_code',code_verifier:verifier})});body=r.ok?await r.json():null;}catch{throw failed();}
 if(typeof body?.id_token!=='string')throw failed();
 const {error}=await auth.signInWithIdToken({provider:'google',token:body.id_token,nonce});
 if(error)throw failed();
}
