import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {comparePath,compareURL,parseComparison,renderCompare,compareURLs,COMPARE_ORDER} from '../server/compare.mjs';
import {BLOG_LANGUAGES} from '../server/blog.mjs';
import {siteRoute} from '../server/hosts.mjs';

const dir=new URL('../content/compare/',import.meta.url);
const pages={};
for(const slug of readdirSync(dir).filter(s=>s.startsWith('thrive-vs-')))for(const f of readdirSync(new URL(slug+'/',dir)))if(f.endsWith('.html'))(pages[slug]??={})[f.slice(0,-5)]=readFileSync(new URL(`${slug}/${f}`,dir),'utf8');
const SHOTS=new Set(JSON.parse(readFileSync(new URL('../content/blog/shots.json',import.meta.url),'utf8')).files.filter(f=>f.startsWith('en/')).map(f=>f.slice(3)));

const sample=(name='Acme',extra='')=>`<!--meta {"date":"2026-11-17","name":"${name}","site":"https://www.acme.example/","logo":"acme.svg","title":"Thrive vs ${name}","description":"D","lede":"L","checked":"November 2026"} -->
<div class="vs-pick"><section><h2>Choose ${name} if</h2><ul><li>a</li></ul></section><section><h2>Choose Thrive if</h2><ul><li>b</li></ul></section></div>
<section class="vs-faq"><h2>Questions</h2><h3>Is there a trial?</h3><p>Yes, 7 days.</p><h3>Card payments?</h3><p>No.</p></section>
<table class="vs-table"><thead><tr><th></th><th>${name}</th><th>Thrive</th></tr></thead><tbody><tr><th>Price</th><td>$29</td><td>$10</td></tr></tbody></table>${extra}`;

test('comparison URLs: English at /compare, other languages under /compare/<language>', ()=>{
 assert.deepEqual(comparePath('/compare'),{lang:'en',slug:''});
 assert.deepEqual(comparePath('/compare/thrive-vs-honeybook/'),{lang:'en',slug:'thrive-vs-honeybook'});
 assert.deepEqual(comparePath('/compare/fr/thrive-vs-17hats'),{lang:'fr',slug:'thrive-vs-17hats'});
 for(const p of ['/compare/honeybook','/compare/en/thrive-vs-x','/compare/fr/../x','/compare/a/b/c','/comparex'])assert.equal(comparePath(p),null,p);
 assert.equal(compareURL('en','thrive-vs-x'),'/compare/thrive-vs-x');assert.equal(compareURL('de'),'/compare/de');
});

test('the site serves the comparison pages and their logos', ()=>{
 const env={THRIVE_APP_URL:'https://app.runonthrive.com',THRIVE_SITE_URL:'https://runonthrive.com'};
 for(const p of ['/compare','/compare/thrive-vs-honeybook','/compare/fr/thrive-vs-dubsado','/compare/logos/honeybook.svg'])assert.equal(siteRoute(new Request('https://runonthrive.com'+p),env),null,p);
});

test('a comparison page has both logos, the buttons, the FAQ data, the call to action and the trademark note', ()=>{
 const html=renderCompare('/compare/thrive-vs-acme',{pages:{'thrive-vs-acme':{en:sample()}},origin:'https://runonthrive.com',app:'https://app.runonthrive.com'});
 assert.match(html,/<h1>Thrive vs Acme<\/h1>/);
 assert.match(html,/<img src="\/compare\/logos\/acme.svg" alt="Acme logo"/);
 assert.match(html,/<a class="btn quiet" href="https:\/\/www.acme.example\/" rel="noopener nofollow" target="_blank">Visit acme.example/);
 assert.match(html,/href="https:\/\/app.runonthrive.com\/auth\/sign-up\?lang=en"/);
 assert.match(html,/"@type":"FAQPage".*"name":"Is there a trial\?"/);
 assert.match(html,/class="blog-cta"/);
 assert.match(html,/Thrive is not affiliated with or endorsed by Acme/);
 assert.match(html,/<link rel="canonical" href="https:\/\/runonthrive.com\/compare\/thrive-vs-acme">/);
 const hub=renderCompare('/compare',{pages:{'thrive-vs-acme':{en:sample()},'thrive-vs-beta':{en:sample('Beta')}}});
 assert.match(hub,/href="\/compare\/thrive-vs-acme"/);assert.match(hub,/Thrive vs Beta/);
 assert.equal(renderCompare('/compare/thrive-vs-nope',{pages:{}}),null);
 assert.throws(()=>parseComparison(sample().replace('"logo":"acme.svg"','"logo":"../x.svg"')));
 assert.throws(()=>parseComparison(sample().replace('https://www.acme','http://www.acme')));
});

test('every comparison is well formed, honest about its sources and has its logo', ()=>{
 assert.deepEqual(Object.keys(pages).sort(),[...COMPARE_ORDER].sort());
 for(const [slug,langs] of Object.entries(pages)){
  const en=parseComparison(langs.en);
  assert.ok(existsSync(new URL(`../public/compare/logos/${en.meta.logo}`,import.meta.url)),`${slug}: logo ${en.meta.logo}`);
  if(en.meta.logo.endsWith('.svg')){const svg=readFileSync(new URL(`../public/compare/logos/${en.meta.logo}`,import.meta.url),'utf8');assert.doesNotMatch(svg,/<script|\son\w+=|href="(?:https?:|\/\/)/i,`${slug}: logo is a plain SVG`);}
  for(const [lang,src] of Object.entries(langs)){
   const where=`${slug}/${lang}`;
   assert.ok(BLOG_LANGUAGES.includes(lang),where);
   const {meta,body}=parseComparison(src);
   assert.equal(meta.site,en.meta.site,where);assert.equal(meta.logo,en.meta.logo,where);assert.equal(meta.name,en.meta.name,where);
   assert.doesNotMatch(src,/bonsai/i,where);
   assert.match(body,/^<div class="vs-pick">/,`${where}: starts with the quick answer`);
   assert.match(body,/<section class="vs-faq">/,`${where}: has questions`);
   assert.match(body,/<table class="vs-table">[\s\S]*<\/table>\s*(<p class="vs-note">[\s\S]*<\/p>\s*)?$/,`${where}: ends with the table`);
   assert.doesNotMatch(body,/<(script|style|img|iframe)|\sstyle=|\son\w+=/i,where);
   for(const [,href] of body.matchAll(/href="([^"]*)"/g))assert.match(href,/^(https:\/\/|\/blog\/|\/compare\/|mailto:)/,`${where}: ${href}`);
   for(const [,shot] of body.matchAll(/data-shot="([^"]+)"/g))assert.ok(SHOTS.has(shot),`${where}: screenshot ${shot}`);
   const rendered=renderCompare(compareURL(lang,slug),{pages,hasShot:()=>true});
   assert.ok(rendered,where);
  }
 }
});

test('the sitemap lists the hub and each comparison once per language', ()=>{
 const urls=compareURLs({'thrive-vs-a':{en:'x',fr:'x'},'thrive-vs-b':{en:'x'}});
 assert.deepEqual(urls,['/compare','/compare/fr','/compare/thrive-vs-a','/compare/fr/thrive-vs-a','/compare/thrive-vs-b']);
});
