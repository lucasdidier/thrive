// Thrive's languages. The English text is the key: L('Save changes'), L('Hello {name}', {name}),
// Ln(n, '{n} day left', '{n} days left'). (Not t(): that name is a local variable all over the codebase.) Each language is one JSON file in /locales, loaded once at start;
// anything not translated yet shows in English, so modules can move over one at a time.
// scripts/i18n-extract.mjs lists every key; tests/i18n.test.mjs checks each locale against it.
// country: the flag shown next to the language in the picker.
export const LANGUAGES=[
 {code:'en',name:'English',country:'GB'},
 {code:'es',name:'Español',country:'ES'},
 {code:'pt-BR',name:'Português (Brasil)',country:'BR'},
 {code:'fr',name:'Français',country:'FR'},
 {code:'de',name:'Deutsch',country:'DE'},
 {code:'it',name:'Italiano',country:'IT'},
 {code:'nl',name:'Nederlands',country:'NL'},
 {code:'pl',name:'Polski',country:'PL'},
 {code:'tr',name:'Türkçe',country:'TR'},
 {code:'id',name:'Bahasa Indonesia',country:'ID'},
];
export const languageFlag=code=>{const c=LANGUAGES.find(l=>l.code===code)?.country;return c?String.fromCodePoint(...[...c].map(ch=>0x1f1a5+ch.charCodeAt(0))):'';};
export const LANGUAGE_CODES=LANGUAGES.map(l=>l.code);
const STORAGE='thrive-language';

let current='en',catalog={},plurals=new Intl.PluralRules('en');

export const supported=code=>LANGUAGE_CODES.includes(code);
// The closest supported language for a browser tag: "pt-PT" → "pt-BR", "de-AT" → "de", else English.
export function matchLanguage(tag){
 const t=String(tag||'').trim();if(supported(t))return t;
 const base=t.split('-')[0].toLowerCase();
 return LANGUAGE_CODES.find(c=>c.split('-')[0]===base)||'en';
}
export const language=()=>current;

const fill=(text,vars)=>vars?String(text).replace(/\{(\w+)\}/g,(m,k)=>k in vars?String(vars[k]):m):String(text);
export function L(text,vars){const v=catalog[text];return fill(typeof v==='string'&&v?v:text,vars);}
// Plurals: the English "other" form is the key; a locale gives {one, few, many, other} as its language needs.
export function Ln(n,one,other,vars={}){
 const all={n,...vars},v=catalog[other];
 if(v&&typeof v==='object'){const form=v[plurals.select(n)]||v.other;if(form)return fill(form,all);}
 return fill(n===1?one:other,all);
}

// Applies a language before the first render. English needs no file.
export async function setLanguage(code,{fetcher=globalThis.fetch}={}){
 const next=supported(code)?code:'en';
 let data={};
 if(next!=='en'){try{const r=await fetcher(`/locales/${next}.json`,{cache:'force-cache'});if(r.ok)data=await r.json();}catch{}}
 current=next;catalog=data&&typeof data==='object'?data:{};plurals=new Intl.PluralRules(next);
 try{globalThis.document&&(document.documentElement.lang=next);}catch{}
 try{globalThis.localStorage?.setItem(STORAGE,next);}catch{}
 return next;
}
// The language to start with: the workspace's choice, else the last one used here, else the browser's.
export function startLanguage(saved){
 if(supported(saved))return saved;
 try{const local=globalThis.localStorage?.getItem(STORAGE);if(supported(local))return local;}catch{}
 return matchLanguage(globalThis.navigator?.language);
}

// Dates, numbers and money in the current language.
export const formatDate=(value,options={month:'short',day:'numeric',year:'numeric'})=>{const d=value instanceof Date?value:new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat(current,options).format(d):'';};
export const formatNumber=(n,options)=>new Intl.NumberFormat(current,options).format(n);
// Tests only: load a catalog directly.
export function useCatalog(code,data){current=code;catalog=data||{};plurals=new Intl.PluralRules(code);}
