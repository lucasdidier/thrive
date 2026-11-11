// Production runs on two hostnames from one Worker: runonthrive.com is the marketing site (landing, legal
// pages, llms.txt, static files) and app.runonthrive.com is the app (THRIVE_APP_URL). THRIVE_SITE_URL names
// the site origin; without it (staging, self-hosting) a single origin serves both, as before.
const LOCAL=/^(localhost|127\.0\.0\.1)$/;
export function siteOrigin(env){
 let site,app='';
 try{site=new URL(env.THRIVE_SITE_URL);}catch{return '';}
 try{app=new URL(env.THRIVE_APP_URL).origin;}catch{}
 if(site.protocol!=='https:'&&!(site.protocol==='http:'&&LOCAL.test(site.hostname)))return '';
 return site.origin!==app?site.origin:'';
}
// Where the Thrive logo on app pages leads: the public site's home, else this deployment's /landing.
export const landingURL=env=>{const site=siteOrigin(env);return site?site+'/':'/landing';};
export const onSite=(request,env)=>{const site=siteOrigin(env);return !!site&&new URL(request.url).origin===site;};

// The blog (/blog, /blog/…) is served on the site too.
const PAGES=new Set(['/privacy','/terms','/checkout']);
const STATIC=/\/[^/]+\.[a-z0-9]{2,5}$/i;
// On the site host: `/` shows the landing page, pages and static files are served, and every other path
// (sign-in, /api, /mcp, consent, client links, embeds) moves permanently to the same path on the app, so
// links already sent out keep working. 308 keeps the method and body for API and MCP calls.
export function siteRoute(request,env){
 if(!onSite(request,env))return null;
 const url=new URL(request.url);
 if(url.pathname==='/')return {request:new Request(new URL('/landing'+url.search,url),request)};
 if(url.pathname==='/landing')return {response:new Response(null,{status:308,headers:{Location:url.origin+'/'+url.search}})};
 if(PAGES.has(url.pathname)||url.pathname==='/blog'||url.pathname.startsWith('/blog/')||STATIC.test(url.pathname))return null;
 return {response:new Response(null,{status:308,headers:{Location:new URL(url.pathname+url.search,env.THRIVE_APP_URL).href,'Cache-Control':'public, max-age=3600'}})};
}
