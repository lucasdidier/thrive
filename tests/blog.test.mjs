import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {blogPath,blogURL,parseArticle,renderBlog,renderShots,blogURLs,BLOG_LANGUAGES,ARTICLE_ORDER,blogText} from '../server/blog.mjs';
import {siteRoute} from '../server/hosts.mjs';

const dir=new URL('../content/blog/',import.meta.url);
const articles={};
for(const slug of readdirSync(dir,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name))
 for(const f of readdirSync(new URL(slug+'/',dir)))if(f.endsWith('.html'))(articles[slug]??={})[f.slice(0,-5)]=readFileSync(new URL(`${slug}/${f}`,dir),'utf8');
const shots=JSON.parse(readFileSync(new URL('shots.json',dir),'utf8')).files;
const SHOTS=new Set(['overview','clients','project','proposal','contracts','client-proposal','client-contract','invoice','client-invoice','time','forms','workflows','builder','scheduling','mcp','client-portal']);
const ALLOWED=new Set(['p','h2','h3','ul','ol','li','strong','em','a','blockquote','figure','figcaption','table','thead','tbody','tr','th','td','code','br']);

test('blog URLs: English at /blog, other languages under /blog/<language>', ()=>{
 assert.deepEqual(blogPath('/blog'),{lang:'en',slug:''});
 assert.deepEqual(blogPath('/blog/how-to-invoice-clients'),{lang:'en',slug:'how-to-invoice-clients'});
 assert.deepEqual(blogPath('/blog/fr'),{lang:'fr',slug:''});
 assert.deepEqual(blogPath('/blog/pt-BR/time-tracking-for-freelancers/'),{lang:'pt-BR',slug:'time-tracking-for-freelancers'});
 assert.equal(blogPath('/blog/en/x'),null);assert.equal(blogPath('/blog/fr/../x'),null);assert.equal(blogPath('/blog/a/b/c'),null);assert.equal(blogPath('/blogx'),null);
 assert.equal(blogURL('en','x'),'/blog/x');assert.equal(blogURL('de'),'/blog/de');
});

test('the site serves the blog instead of sending it to the app', ()=>{
 const env={THRIVE_APP_URL:'https://app.runonthrive.com',THRIVE_SITE_URL:'https://runonthrive.com'};
 for(const p of ['/blog','/blog/fr/automate-busy-work','/blog-shots/fr/time.webp','/sitemap.xml','/robots.txt'])assert.equal(siteRoute(new Request('https://runonthrive.com'+p),env),null,p);
});

test('five articles in every language, each well formed and matching the English', ()=>{
 assert.deepEqual(Object.keys(articles).sort(),[...ARTICLE_ORDER].sort());
 for(const slug of ARTICLE_ORDER){
  const en=parseArticle(articles[slug].en),enShots=[...en.body.matchAll(/data-shot="([a-z-]+)"/g)].map(m=>m[1]);
  for(const lang of BLOG_LANGUAGES){
   const src=articles[slug][lang];assert.ok(src,`${slug}/${lang}.html is missing`);
   const {meta,body}=parseArticle(src);
   assert.ok(meta.title.length>10&&meta.description.length>=90&&meta.description.length<=200,`${slug}/${lang} meta`);
   assert.deepEqual([...body.matchAll(/data-shot="([a-z-]+)"/g)].map(m=>m[1]),enShots,`${slug}/${lang} screenshots`);
   for(const s of enShots)assert.ok(SHOTS.has(s),`${slug}: unknown screenshot ${s}`);
   for(const [,tag] of body.matchAll(/<([a-z0-9]+)[\s>]/g))assert.ok(ALLOWED.has(tag)||tag==='figure',`${slug}/${lang}: <${tag}>`);
   assert.doesNotMatch(body,/<script|on[a-z]+=|style=/i,`${slug}/${lang}: no scripts or inline styles`);
   for(const [,href] of body.matchAll(/href="([^"]+)"/g)){
    if(href.startsWith('/blog'))assert.ok(blogPath(href)?.lang===lang&&articles[blogPath(href).slug],`${slug}/${lang}: link ${href}`);
    else assert.match(href,/^https:\/\/(app\.)?runonthrive\.com\//,`${slug}/${lang}: link ${href}`);
   }
  }
 }
});

test('every screenshot the articles use exists in English, and the pages render with them', ()=>{
 const has=(l,n)=>shots.includes(`${l}/${n}`);
 for(const slug of ARTICLE_ORDER)for(const [,s] of articles[slug].en.matchAll(/data-shot="([a-z-]+)"/g))assert.ok(has('en',s),`en/${s}.webp`);
 for(const s of shots)assert.ok(existsSync(new URL(`../public/blog-shots/${s}.webp`,import.meta.url)),s);
 const html=renderBlog('/blog/de/how-to-invoice-clients',{articles,hasShot:has,origin:'https://runonthrive.com',app:'https://app.runonthrive.com'});
 assert.match(html,/<html lang="de">/);
 assert.match(html,/hreflang="fr" href="https:\/\/runonthrive.com\/blog\/fr\/how-to-invoice-clients"/);
 assert.match(html,/hreflang="x-default" href="https:\/\/runonthrive.com\/blog\/how-to-invoice-clients"/);
 assert.match(html,/href="https:\/\/app.runonthrive.com\/auth\/sign-up">Kostenlos testen/);
 assert.match(html,/<img src="\/blog-shots\/(de|en)\/invoice.webp"/);
 assert.match(html,/"@type":"BlogPosting"/);
 assert.ok(html.includes(blogText('de','ctaButton')));
 assert.match(renderBlog('/blog/fr',{articles,hasShot:has}),/Le blog de Thrive/);
 assert.equal(renderBlog('/blog/nope',{articles,hasShot:has}),null);
});

test('a missing translated screenshot falls back to English, a missing one disappears', ()=>{
 const body='<figure data-shot="time"><figcaption>Le <em>temps</em></figcaption></figure>';
 assert.match(renderShots(body,'fr',(l)=>l==='en'),/src="\/blog-shots\/en\/time.webp" alt="Le temps"/);
 assert.equal(renderShots(body,'fr',()=>false),'');
});

test('the sitemap lists each index and article once per language', ()=>{
 const urls=blogURLs(articles);
 assert.equal(urls.length,BLOG_LANGUAGES.length*(1+ARTICLE_ORDER.length));
 assert.equal(new Set(urls).size,urls.length);
});

test('cards show an illustration per article, the same in every language', async()=>{
 const {blogArt}=await import('../server/blog-art.mjs');
 const html=renderBlog('/blog/it',{articles,hasShot:()=>true});
 assert.equal((html.match(/class="blog-art"/g)||[]).length,ARTICLE_ORDER.length);
 for(const slug of ARTICLE_ORDER)assert.match(blogArt(slug),/^<span class="blog-art" style="--c:#[0-9a-f]{6}" aria-hidden="true"><svg/);
 assert.doesNotMatch(blogArt('how-to-invoice-clients'),/€/,'the euro sign is an entity');
});
