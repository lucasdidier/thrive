// Cloudflare Turnstile (free captcha) before emailing a sign-in code. On when both keys are set:
// TURNSTILE_SITE_KEY (public, a wrangler var) and TURNSTILE_SECRET_KEY (a Worker secret).
export const turnstileSiteKey=env=>/^[0-9A-Za-z_-]{10,100}$/.test(String(env.TURNSTILE_SITE_KEY||''))?String(env.TURNSTILE_SITE_KEY):'';
export const turnstileEnabled=env=>!!(turnstileSiteKey(env)&&env.TURNSTILE_SECRET_KEY);

// true when the token is valid (or Turnstile isn't configured). Fails closed: Google sign-in still works.
export async function verifyTurnstile(env,token,ip='',{fetcher=fetch}={}){
 if(!turnstileEnabled(env))return true;
 if(typeof token!=='string'||!token||token.length>2048)return false;
 try{
  const r=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:token,...(ip?{remoteip:ip}:{})}),signal:AbortSignal.timeout(5000)});
  const data=await r.json().catch(()=>({}));
  return data.success===true;
 }catch{return false;}
}
