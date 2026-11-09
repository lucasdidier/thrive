import landing from '../../ui/landing.html?raw';
import {env} from 'cloudflare:workers';
import {onSite} from '../../server/hosts.mjs';
import {appOrigin} from '../../server/auth.mjs';
// The landing page. On the marketing site (runonthrive.com, see server/hosts.mjs) it is the home page,
// indexable, with sign-in and sign-up links pointing at the app. Every deployment also serves it at
// /landing so staging can preview it; that copy is kept out of search results.
export function GET(request:Request){
 const site=onSite(request,env);
 let html=landing.replaceAll('hello@thrive.example',String(env.THRIVE_SUPPORT_EMAIL||'hello@thrive.example'));
 if(site)html=html.replaceAll('href="/auth/',`href="${appOrigin(env)}/auth/`);
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff',...(site?{}:{'X-Robots-Tag':'noindex'})}});
}
