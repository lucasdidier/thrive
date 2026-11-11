import landing from '../../ui/landing.html?raw';
import {env} from 'cloudflare:workers';
import {onSite,siteOrigin} from '../../server/hosts.mjs';
import {appOrigin} from '../../server/auth.mjs';
import {renderLanding} from '../../server/landing-page.mjs';
const files=import.meta.glob('../../content/landing/*.json',{import:'default',eager:true}) as Record<string,Record<string,string>|string[]>;
const maps:Record<string,Record<string,string>>={};
for(const [file,data] of Object.entries(files)){const m=/\/([A-Za-z-]+)\.json$/.exec(file);if(m&&m[1]!=='strings'&&!Array.isArray(data))maps[m[1]]=data;}
// The landing page. On the marketing site (runonthrive.com, see server/hosts.mjs) it is the home page,
// indexable, with sign-in and sign-up links pointing at the app. Every deployment also serves it at
// /landing (and /landing/<language>) so staging can preview it; those copies are kept out of search results.
export function landingResponse(request:Request,lang:string){
 const site=onSite(request,env);
 let app='';try{app=appOrigin(env);}catch{}
 const html=renderLanding(landing,{lang,maps,site,app,origin:siteOrigin(env)||new URL(request.url).origin,support:String(env.THRIVE_SUPPORT_EMAIL||'')});
 if(!html)return new Response('Not found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff',...(site?{}:{'X-Robots-Tag':'noindex'})}});
}
