// Emails Thrive writes for a workspace owner (trial, summaries, form and document notices) go out in that
// workspace's language (settings.language). The browser's translations in /locales are fetched from this
// Worker's own site and kept per isolate. Building an email is synchronous, so switching the shared catalog
// for the duration of one build can't mix languages between requests.
import {useCatalog,supported} from '../public/i18n.js';
import {appOrigin} from './auth.mjs';

const cache=new Map();
export async function emailCatalog(env,code,{fetcher=fetch,now=Date.now()}={}){
 if(!supported(code)||code==='en')return null;
 const hit=cache.get(code);if(hit&&hit.until>now)return hit.data;
 let data=null;
 try{const r=await fetcher(new URL(`/locales/${code}.json`,appOrigin(env)),{headers:{accept:'application/json'}});if(r.ok)data=await r.json();}catch{}
 cache.set(code,{data,until:now+(data?3600000:300000)});
 return data;
}
// Runs build() with the workspace's language active, then puts English back. build must not await.
export function inLanguage(code,catalog,build){
 if(!catalog||!supported(code)||code==='en')return build();
 useCatalog(code,catalog);
 try{return build();}finally{useCatalog('en',{});}
}
export async function inWorkspaceLanguage(env,state,build,options){
 const code=state?.settings?.language;
 return inLanguage(code,await emailCatalog(env,code,options),build);
}
