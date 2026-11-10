// Lists every translatable text in the browser code: L('…') and the "other" form of Ln(n,'…','…').
// node scripts/i18n-extract.mjs            → prints how many keys each locale is missing
// node scripts/i18n-extract.mjs --missing es → prints the missing keys for one locale as JSON
import {readFileSync,readdirSync} from 'node:fs';
const dir=new URL('../public/',import.meta.url);
const str=String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|\x60((?:[^\x60\\$]|\\.)*)\x60`;
const one=new RegExp(String.raw`(?<![\w.$])L\(\s*(?:${str})`,'g');
const plural=new RegExp(String.raw`(?<![\w.$])Ln\([^,()]+(?:\([^()]*\))?,\s*(?:${str})\s*,\s*(?:${str})`,'g');
const unescape=s=>s.replace(/\\(.)/g,(m,c)=>({n:'\n',t:'\t'})[c]??c);
export function extractKeys(){
 const keys=new Map();
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.js')&&f!=='i18n.js')){
  const src=readFileSync(new URL(file,dir),'utf8');
  for(const m of src.matchAll(one)){const k=unescape(m[1]??m[2]??m[3]);if(!keys.has(k))keys.set(k,{file,plural:false});}
  for(const m of src.matchAll(plural)){const k=unescape(m[4]??m[5]??m[6]);keys.set(k,{file,plural:true,one:unescape(m[1]??m[2]??m[3])});}
 }
 return keys;
}
export const placeholders=s=>[...String(s).matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
if(import.meta.url===`file://${process.argv[1]}`){
 const keys=extractKeys(),{LANGUAGE_CODES}=await import('../public/i18n.js');
 const only=process.argv[2]==='--missing'?process.argv[3]:null;
 for(const code of LANGUAGE_CODES.filter(c=>c!=='en'&&(!only||c===only))){
  let data={};try{data=JSON.parse(readFileSync(new URL(`locales/${code}.json`,dir),'utf8'));}catch{}
  const missing=[...keys.keys()].filter(k=>!(k in data));
  if(only)console.log(JSON.stringify(Object.fromEntries(missing.map(k=>[k,keys.get(k).plural?{one:keys.get(k).one,other:k}:''])),null,1));
  else console.log(`${code}: ${keys.size-missing.length}/${keys.size} translated`);
 }
}
