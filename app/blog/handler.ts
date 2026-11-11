import {env} from 'cloudflare:workers';
import {renderBlog} from '../../server/blog.mjs';
import {siteOrigin} from '../../server/hosts.mjs';
import {appOrigin} from '../../server/auth.mjs';
import {articles,hasShot} from './content';
import {landingPath} from '../../server/landing-page.mjs';
// The blog lives on the public site (runonthrive.com/blog). Other deployments serve it too, for previews,
// kept out of search results.
export function blogResponse(request:Request){
 const url=new URL(request.url),site=siteOrigin(env);
 let app='';try{app=appOrigin(env);}catch{}
 const indexable=!!site&&url.origin===site;
 const html=renderBlog(url.pathname,{articles,hasShot,origin:site||url.origin,app:app||url.origin,homeFor:l=>landingPath(l,indexable)});
 if(!html)return new Response('Not found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff',...(indexable?{}:{'X-Robots-Tag':'noindex'})}});
}
