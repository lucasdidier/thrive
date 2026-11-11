// Request guard for the self-hosted Worker: rate limits on public writes and
// error alerts to the admin. Both degrade to no-ops when not configured.

// Cloudflare Rate Limiting bindings (wrangler "ratelimits"). Keys are per client IP and route group.
// A rule with reads:true also limits GET: public links and embeds load the owner's whole workspace per view.
const limits=[
 [/^\/api\/beta$/,'RATE_LIMIT_SIGNUP','beta'],
 [/^\/api\/auth$/,'RATE_LIMIT_PUBLIC','auth'],
 [/^\/api\/shared\//,'RATE_LIMIT_PUBLIC','shared',{reads:true}],
 [/^\/embed\//,'RATE_LIMIT_PUBLIC','embed',{reads:true}],
 [/^\/api\/errors$/,'RATE_LIMIT_PUBLIC','errors'],
 [/^\/visit$/,'RATE_LIMIT_PUBLIC','visit'],
 [/^\/api\/usage$/,'RATE_LIMIT_PUBLIC','usage'],
 [/^\/mcp$/,'RATE_LIMIT_MCP','mcp'],
];
// The client's address for rate limits. IPv6 users usually control a whole /64, so it counts as one.
export function clientKey(request){
 const ip=request.headers.get('cf-connecting-ip')||'unknown';
 if(!ip.includes(':'))return ip;
 const parts=ip.split('::')[0].split(':');
 return parts.length>=4?parts.slice(0,4).join(':')+'::/64':ip;
}
export async function rateLimited(request,env){
 if(request.method==='OPTIONS')return false;
 const path=new URL(request.url).pathname,rule=limits.find(([re])=>re.test(path));
 if(!rule||(['GET','HEAD'].includes(request.method)&&!rule[3]?.reads))return false;
 const limiter=env[rule[1]]||(rule[1]==='RATE_LIMIT_MCP'?env.RATE_LIMIT_PUBLIC:null);if(!limiter?.limit)return false;
 try{return !(await limiter.limit({key:`${rule[2]}${['GET','HEAD'].includes(request.method)?'-read':''}:${clientKey(request)}`})).success;}catch{return false;}
}
// Emailed sign-in codes share /api/auth with ordinary sign-in, but each one sends an email to any address,
// so they also count against the strict signup limit (3 a minute per IP) to stop email bombing.
// Also per address, so many IPs can't flood one inbox, and the limit fails closed when the binding errors.
export async function codeLimited(request,env,email=''){
 const limiter=env.RATE_LIMIT_SIGNUP;if(!limiter?.limit)return false;
 try{
  if(!(await limiter.limit({key:`code:${clientKey(request)}`})).success)return true;
  if(email&&!(await limiter.limit({key:`code-to:${await digest(email.toLowerCase())}`})).success)return true;
  return false;
 }catch{return true;}
}
export const tooMany=()=>Response.json({error:'Too many attempts. Please wait a minute and try again.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':'60'}});

const clip=(v,n)=>String(v??'').slice(0,n);
const recent=new Map();
let alertHour=0,alertCount=0;
async function digest(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].slice(0,8).map(x=>x.toString(16).padStart(2,'0')).join('');}
// Logs every error (Workers Logs) and emails the admin at most once per error type per hour.
// Resend's idempotency key makes the hourly limit hold across Worker instances.
export async function reportError(env,{source,status,message,stack,path},{fetcher=fetch,now=Date.now()}={}){
 const entry={source:clip(source,40),status,message:clip(message,500),path:clip(path,200)};
 console.error('thrive.error',JSON.stringify({...entry,stack:clip(stack,2000)}));
 const to=String(env.THRIVE_ADMIN_EMAIL||env.THRIVE_OWNER_EMAIL||'').trim();
 if(!env.RESEND_API_KEY||!env.THRIVE_NOTIFICATIONS_FROM||!to)return {sent:false};
 // Browser reports are unauthenticated (anyone can post one), so they share a single alert per hour.
 const hour=Math.floor(now/3600000),sig=entry.source==='browser'?'browser':await digest(`${entry.source}|${entry.status}|${entry.path.replace(/[0-9a-f-]{8,}|\d+/gi,':id')}|${entry.message.slice(0,120)}`),key=`alert-${sig}-${hour}`;
 if(alertHour!==hour){alertHour=hour;alertCount=0;}
 if(++alertCount>20)return {sent:false};
 if(recent.has(key))return {sent:false};recent.set(key,now);if(recent.size>500)recent.delete(recent.keys().next().value);
 const host=(()=>{try{return new URL(env.THRIVE_APP_URL).host;}catch{return 'Thrive';}})();
 try{const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:env.THRIVE_NOTIFICATIONS_FROM,to:[to],subject:`[${host}] ${entry.source} error${status?' '+status:''}: ${clip(entry.message,80)}`,text:[`Where: ${entry.source} ${entry.path}`,status?`Status: ${status}`:'',`Message: ${entry.message}`,'',clip(stack,2000),'','Same errors are grouped: at most one email per hour. Full logs: Cloudflare dashboard → Workers → Logs.'].filter(Boolean).join('\n')})});return {sent:r.ok};}
 catch{return {sent:false};}
}
// Browser errors posted by public/error-reporter.js.
export async function handleClientError(request,env){
 if(request.method!=='POST'||request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:204});
 if(Number(request.headers.get('content-length')||0)>8000)return new Response(null,{status:204});
 let body;try{const text=await request.text();if(text.length>8000)return new Response(null,{status:204});body=JSON.parse(text);}catch{return new Response(null,{status:204});}
 await reportError(env,{source:'browser',message:body.message,stack:body.stack,path:body.path});
 return new Response(null,{status:204});
}
