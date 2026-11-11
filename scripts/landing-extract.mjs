// Lists every English string on the landing page (ui/landing.html) and in its demo scripts
// (public/landing*.js) into content/landing/strings.json, in page order. Each language is a JSON file
// content/landing/<lang>.json mapping the English text to its translation; server/landing-i18n.mjs
// applies it to the HTML and public/landing-i18n.js to what the demo renders in the browser.
//   node scripts/landing-extract.mjs        then add the new strings to each language file
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {landingStrings} from '../server/landing-i18n.mjs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const strings=landingStrings(read('ui/landing.html'),['public/landing-app.js','public/landing-phone.js','public/landing.js'].map(read));
writeFileSync(new URL('content/landing/strings.json',root),JSON.stringify(strings,null,1)+'\n');
console.log(strings.length,'strings');
for(const lang of ['es','pt-BR','fr','de','it','nl','pl','tr','id']){
 const file=new URL(`content/landing/${lang}.json`,root);
 if(!existsSync(file)){console.log(lang,'missing');continue;}
 const have=JSON.parse(readFileSync(file,'utf8')),missing=strings.filter(s=>!(s in have));
 console.log(lang,missing.length?`${missing.length} missing`:'complete');
}
