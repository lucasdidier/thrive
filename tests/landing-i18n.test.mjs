import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {landingStrings,translateHTML} from '../server/landing-i18n.mjs';
import {renderLanding,landingPath} from '../server/landing-page.mjs';
import {siteRoute} from '../server/hosts.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('ui/landing.html');
const strings=JSON.parse(read('content/landing/strings.json'));
const env={THRIVE_APP_URL:'https://app.runonthrive.com',THRIVE_SITE_URL:'https://runonthrive.com'};

test('strings.json lists every string on the page and in the demo (run scripts/landing-extract.mjs)', ()=>{
 const now=landingStrings(html,['public/landing-app.js','public/landing-phone.js','public/landing.js'].map(read));
 assert.deepEqual(now.filter(s=>!strings.includes(s)),[]);
});

test('translating keeps markup, spacing, entities and code untouched', ()=>{
 const out=translateHTML('<p class="x"> Start free trial </p><a aria-label="Thrive home">Paper &amp; Pine</a><script>const s="Start free trial"</script>',{'Start free trial':'Essai gratuit','Thrive home':'Accueil','Paper & Pine':'Papier & Pin'});
 assert.equal(out,'<p class="x"> Essai gratuit </p><a aria-label="Accueil">Papier &amp; Pin</a><script>const s="Start free trial"</script>');
});

test('each language is a landing page with its own address, alternates and language menu', ()=>{
 const maps={fr:{'Start free trial':'Essai gratuit','Pricing':'Tarifs'}};
 const fr=renderLanding(html,{lang:'fr',maps,site:true,app:'https://app.runonthrive.com',origin:'https://runonthrive.com'});
 assert.match(fr,/<html lang="fr">/);
 assert.match(fr,/<link rel="canonical" href="https:\/\/runonthrive.com\/fr">/);
 assert.match(fr,/hreflang="en" href="https:\/\/runonthrive.com\/"/);
 assert.match(fr,/>Essai gratuit</);
 assert.match(fr,/href="https:\/\/app.runonthrive.com\/auth\/sign-up\?lang=fr"/);
 assert.match(fr,/href="\/blog\/fr"/);
 assert.match(fr,/<details class="blog-lang">/);
 assert.match(fr,/id="landing-i18n">\{"Start free trial":"Essai gratuit"/);
 assert.equal(renderLanding(html,{lang:'de',maps}),null,'no page for a language without translations');
 const en=renderLanding(html,{lang:'en',maps,site:true,origin:'https://runonthrive.com'});
 assert.doesNotMatch(en,/landing-i18n"/);assert.match(en,/href="\/blog"/);
 assert.equal(landingPath('fr',true),'/fr');assert.equal(landingPath('fr',false),'/landing/fr');assert.equal(landingPath('en',false),'/landing');
});

test('runonthrive.com/fr serves the French landing page; old /landing/fr addresses move', ()=>{
 assert.equal(new URL(siteRoute(new Request('https://runonthrive.com/fr'),env).request.url).pathname,'/landing/fr');
 assert.equal(new URL(siteRoute(new Request('https://runonthrive.com/pt-BR/'),env).request.url).pathname,'/landing/pt-BR');
 assert.equal(siteRoute(new Request('https://runonthrive.com/landing/de'),env).response.headers.get('location'),'https://runonthrive.com/de');
 assert.equal(siteRoute(new Request('https://runonthrive.com/xx'),env).response.status,308,'unknown paths still go to the app');
});

test('every finished language covers all the strings', ()=>{
 for(const lang of ['es','pt-BR','fr','de','it','nl','pl','tr','id']){
  const file=new URL(`../content/landing/${lang}.json`,import.meta.url);if(!existsSync(file))continue;
  const map=JSON.parse(readFileSync(file,'utf8'));
  assert.deepEqual(strings.filter(s=>typeof map[s]!=='string'),[],lang);
 }
});

test('sign-up links always name the language, English included', ()=>{
 const en=renderLanding(html,{lang:'en',site:true,app:'https://app.runonthrive.com',origin:'https://runonthrive.com'});
 assert.match(en,/href="https:\/\/app.runonthrive.com\/auth\/sign-up\?lang=en"/);
 assert.doesNotMatch(en,/href="[^"]*\/auth\/sign-up"/);
 assert.match(read('public/i18n.js'),/cache:'no-cache'/,'translations revalidate, so a deploy reaches browsers that loaded an older file');
});
