// The landing page in each language: runonthrive.com/ (English), /fr, /de… On deployments without a
// public site (staging, self-hosted) the same pages are at /landing and /landing/<language>.
import {translateHTML} from './landing-i18n.mjs';
import {BLOG_LANGUAGES,blogURL,languageMenu} from './blog.mjs';

export const LANDING_LANGUAGES=BLOG_LANGUAGES;
export const landingPath=(lang,site)=>site?(lang==='en'?'/':'/'+lang):(lang==='en'?'/landing':'/landing/'+lang);
const escAttr=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

// html: ui/landing.html. maps: {lang: {English: translation}}. origin: the site's origin (for canonical
// and alternate links). site: whether this is the public site. app: the app's origin for sign-in links.
export function renderLanding(html,{lang='en',maps={},origin='',site=false,app='',support=''}){
 const available=LANDING_LANGUAGES.filter(l=>l==='en'||maps[l]);
 if(!available.includes(lang))return null;
 const map=lang==='en'?null:maps[lang];
 let out=support?html.replaceAll('hello@thrive.example',support):html;
 if(map)out=translateHTML(out,map);
 if(site&&app)out=out.replaceAll('href="/auth/',`href="${app}/auth/`);
 if(lang!=='en')out=out.replace(/href="([^"]*\/auth\/sign-(?:up|in))"/g,`href="$1?lang=${lang}"`);
 out=out.replace('<html lang="en">',`<html lang="${lang}">`);
 out=out.replaceAll('href="/blog"',`href="${blogURL(lang)}"`);
 const url=origin+landingPath(lang,true);
 const alternates=available.map(l=>`<link rel="alternate" hreflang="${l}" href="${escAttr(origin+landingPath(l,true))}">`).join('')+`<link rel="alternate" hreflang="x-default" href="${escAttr(origin+'/')}">`;
 out=out.replace('<meta property="og:url" content="https://runonthrive.com/">',`<meta property="og:url" content="${escAttr(url)}"><meta property="og:locale" content="${lang.replace('-','_')}"><link rel="canonical" href="${escAttr(url)}">${alternates}<link rel="stylesheet" href="/blog.css">`);
 // Language menu in the header, before the GitHub link.
 out=out.replace('<div class="bar-act">',`<div class="bar-act">${languageMenu(lang,l=>landingPath(l,site),available)}`);
 // The demo renders more text in the browser: give it the language's strings.
 if(map)out=out.replace('<script type="module" src="/landing.js"></script>',`<script type="application/json" id="landing-i18n">${JSON.stringify(map).replace(/</g,'\\u003c')}</script><script type="module" src="/landing-i18n.js"></script><script type="module" src="/landing.js"></script>`);
 return out;
}
