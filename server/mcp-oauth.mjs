// MCP sign-in for AI assistants (Claude, ChatGPT, Cursor, Codex…). /mcp is an OAuth 2.1 resource server.
// Supabase Auth's OAuth 2.1 server signs the user in and issues the access token, which /mcp verifies like
// any Supabase session. Enable it in Supabase → Authentication → OAuth Server, with dynamic client
// registration and the authorization path /oauth/consent. Thrive detects it from Supabase's discovery
// document, so nothing is advertised until it's on. THRIVE_MCP_OAUTH=off hides it again.
import {supabaseURL} from './supabase-store.mjs';
import {appOrigin,authContext,verifiedAccount} from './auth.mjs';

const TTL=300000;
let cached={url:'',at:0,value:null};
export const resetAuthorizationServerCache=()=>{cached={url:'',at:0,value:null};};

// Supabase's RFC 8414 metadata, cached per isolate for five minutes (including "not enabled").
export async function authorizationServer(env,fetcher=fetch,now=Date.now()){
 if(env.THRIVE_MCP_OAUTH==='off')return null;
 let url;try{url=supabaseURL(env)+'/.well-known/oauth-authorization-server/auth/v1';}catch{return null;}
 if(cached.url===url&&now-cached.at<TTL)return cached.value;
 let value=null;
 try{const r=await fetcher(url,{headers:{accept:'application/json'}});if(r.ok){const j=await r.json();if(typeof j?.issuer==='string'&&typeof j.authorization_endpoint==='string'&&typeof j.token_endpoint==='string')value=j;}}catch{}
 cached={url,at:now,value};return value;
}

const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'*'};
const RESOURCE_PATHS=['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp'];
// Older MCP clients look for the authorization server's metadata on the MCP server's own origin.
const SERVER_PATHS=['/.well-known/oauth-authorization-server','/.well-known/oauth-authorization-server/mcp'];

// Discovery documents (RFC 9728 protected resource metadata, plus a copy of Supabase's RFC 8414 metadata).
export async function mcpDiscovery(request,env,fetcher=fetch){
 const path=new URL(request.url).pathname,resource=RESOURCE_PATHS.includes(path);
 if(!resource&&!SERVER_PATHS.includes(path))return null;
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...CORS,Allow:'GET, HEAD, OPTIONS'}});
 const server=await authorizationServer(env,fetcher);
 if(!server)return Response.json({error:'MCP sign-in is not enabled on this deployment.'},{status:404,headers:{...CORS,'Cache-Control':'no-store'}});
 const headers={...CORS,'Cache-Control':'public, max-age=300'};
 if(!resource)return Response.json(server,{headers});
 return Response.json({resource:appOrigin(env)+'/mcp',authorization_servers:[server.issuer],bearer_methods_supported:['header'],scopes_supported:['openid','email','profile'],resource_name:'Thrive',resource_documentation:'https://github.com/lucasdidier/thrive#thrive-mcp'},{headers});
}

// Tells an MCP client where to sign in when it calls /mcp without a valid token.
export async function withMcpChallenge(response,request,env,fetcher=fetch){
 if(response.status!==401||new URL(request.url).pathname!=='/mcp'||!await authorizationServer(env,fetcher))return response;
 const headers=new Headers(response.headers),token=request.headers.get('authorization')?.startsWith('Bearer ');
 headers.set('WWW-Authenticate',`Bearer resource_metadata="${appOrigin(env)}/.well-known/oauth-protected-resource", scope="openid email profile"${token?', error="invalid_token"':''}`);
 headers.set('Access-Control-Expose-Headers','WWW-Authenticate');
 return new Response(response.body,{status:401,statusText:response.statusText,headers});
}

const ID=/^[A-Za-z0-9_-]{8,128}$/;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Supabase only redirects to the client's registered URI; native clients may use custom schemes.
const redirectable=v=>{try{const u=new URL(v);return !['javascript:','data:','vbscript:','file:','blob:'].includes(u.protocol);}catch{return false;}};
const host=v=>{try{const u=new URL(v);return u.host||u.protocol.replace(/:$/,'');}catch{return '';}};
export const consentPath=id=>'/oauth/consent?authorization_id='+id;

function page(body,status=200){
 return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="referrer" content="no-referrer"><title>Connect an assistant — Thrive</title><link rel="icon" href="/favicon.svg"><script src="/appearance.js"></script><link rel="stylesheet" href="/typography.css"><link rel="stylesheet" href="/auth.css"></head><body><div class="auth-layout consent-layout"><section class="auth-side"><header class="auth-header"><a href="/" class="brand" aria-label="Thrive home"><img src="/favicon.svg" alt="" width="28" height="28">thrive</a></header><main class="auth-main"><div class="auth-card">${body}</div></main></section></div></body></html>`,
  {status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'"}});
}
const problem=(title,status=400)=>page(`<h1>${esc(title)}</h1><p class="subtitle">Start again from your assistant.</p>`,status);
const redirect=location=>new Response(null,{status:303,headers:{Location:location}});

function consent(details){
 const name=details.client?.name?.trim()||'An AI assistant',back=host(details.redirect_uri);
 return page(`<h1>Allow ${esc(name)} to use your Thrive workspace?</h1><p class="subtitle">${esc(details.user?.email)}${back?` · returns to ${esc(back)}`:''}</p>
<ul class="consent-points"><li>It can read and change your clients, projects, documents, invoices, time and other records.</li><li>It can’t send email or calendar invitations without your OK, or take payments.</li></ul>
<form method="post" action="/oauth/consent" class="consent-actions"><input type="hidden" name="authorization_id" value="${esc(details.authorization_id)}"><button class="btn primary" name="decision" value="approve">Allow access</button><button class="btn" name="decision" value="deny">Deny</button></form>`);
}

// The authorization path Supabase sends users to: /oauth/consent?authorization_id=…  Served outside the
// app shell, so a brand-new account can approve an assistant before onboarding.
export async function oauthConsent(request,env,{contextFactory=authContext}={}){
 let context;
 try{
  if(!['GET','POST'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
  context=contextFactory(request,env);
  let id=new URL(request.url).searchParams.get('authorization_id')||'',decision='';
  if(request.method==='POST'){
   if(request.headers.get('origin')!==context.origin)return context.finish(problem('Open this page on Thrive to continue.',403));
   const form=await request.formData().catch(()=>null);id=String(form?.get('authorization_id')||'');decision=String(form?.get('decision')||'');
  }
  if(!ID.test(id))return context.finish(problem('This connection request isn’t valid'));
  if(!await verifiedAccount(context,request,env))return context.finish(redirect('/auth/sign-in?next='+encodeURIComponent(consentPath(id))));
  const oauth=context.client.auth.oauth;
  if(request.method==='POST'){
   if(!['approve','deny'].includes(decision))return context.finish(problem('Choose Allow access or Deny'));
   const {data,error}=await (decision==='approve'?oauth.approveAuthorization(id,{skipBrowserRedirect:true}):oauth.denyAuthorization(id,{skipBrowserRedirect:true}));
   if(error||!redirectable(data?.redirect_url))return context.finish(problem('This connection request has expired'));
   return context.finish(redirect(data.redirect_url));
  }
  const {data,error}=await oauth.getAuthorizationDetails(id);
  if(error||!data)return context.finish(problem('This connection request has expired'));
  if(!data.authorization_id)return context.finish(redirectable(data.redirect_url)?redirect(data.redirect_url):problem('This connection request has expired'));
  return context.finish(consent(data));
 }catch{const response=problem('Thrive couldn’t open this request',503);return context?context.finish(response):response;}
}
