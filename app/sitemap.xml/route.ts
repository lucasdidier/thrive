import {env} from 'cloudflare:workers';
import {blogURLs} from '../../server/blog.mjs';
import {siteOrigin} from '../../server/hosts.mjs';
import {articles} from '../blog/content';
const landings=Object.keys(import.meta.glob('../../content/landing/*.json')).map(f=>/\/([A-Za-z-]+)\.json$/.exec(f)?.[1]).filter(l=>l&&l!=='strings'&&l!=='en');
// The public site's pages for search engines: home, legal pages and every blog article in every language.
export function GET(request:Request){
 const origin=siteOrigin(env)||new URL(request.url).origin;
 const paths=['/',...landings.map(l=>'/'+l),'/privacy','/terms',...blogURLs(articles)];
 const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p=>`<url><loc>${origin}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
 return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=3600'}});
}
