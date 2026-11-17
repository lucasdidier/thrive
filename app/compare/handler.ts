import {env} from 'cloudflare:workers';
import {renderCompare} from '../../server/compare.mjs';
import {siteOrigin} from '../../server/hosts.mjs';
import {appOrigin} from '../../server/auth.mjs';
import {landingPath} from '../../server/landing-page.mjs';
import {hasShot} from '../blog/content';
import {pages} from './content';
// Comparison pages live on the public site (runonthrive.com/compare), like the blog. Other deployments
// serve them too, for previews, kept out of search results.
export function compareResponse(request:Request){
 const url=new URL(request.url),site=siteOrigin(env);
 let app='';try{app=appOrigin(env);}catch{}
 const indexable=!!site&&url.origin===site;
 const html=renderCompare(url.pathname,{pages,hasShot,origin:site||url.origin,app:app||url.origin,homeFor:l=>landingPath(l,indexable)});
 if(!html)return new Response('Not found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff',...(indexable?{}:{'X-Robots-Tag':'noindex'})}});
}
