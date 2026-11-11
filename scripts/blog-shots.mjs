// Captures the blog's screenshots in every language from the showcase preview (fictional data).
//   node scripts/blog-shots.mjs              every language
//   node scripts/blog-shots.mjs fr de        only these languages
//   SHOTS=time,forms node scripts/blog-shots.mjs   only these screenshots
// Writes public/blog-shots/<language>/<name>.webp and lists them in content/blog/shots.json.
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LANGUAGES} from '../public/i18n.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const chrome=process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT=4177,DEBUG=9337,W=1440,H=900;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// __click waits up to 6 s for the element: some pages render after their data loads.
const helpers=`window.__click=async sel=>{for(let i=0;i<30;i++){const el=document.querySelector(sel);if(el){el.click();return;}await new Promise(r=>setTimeout(r,200));}throw Error('Missing '+sel);};`;
// Steps use data attributes only, so they work in every language.
const shots={
 overview:{hash:'overview'},
 clients:{hash:'clients'},
 project:{hash:'projects/p1'},
 invoice:{hash:'invoices',steps:[`await __click('[data-action="invoice"], [data-action="open-invoice"], tr [data-id] button, .data-table button')`]},
 time:{hash:'time',keepTimer:true},
 forms:{hash:'forms',steps:[`await __click('[data-action="crm-forms-tab"][data-tab="submissions"]')`]},
 workflows:{hash:'workflows'},
 builder:{hash:'workflows',steps:[`await __click('[data-action="wf-template"][data-template="tag"]')`]},
 proposal:{hash:'proposals',steps:[`await __click('[data-action="document"][data-id="doc-p1"]')`,`await __click('[data-action="doc-client"]')`]},
 contracts:{hash:'contracts',steps:[`await __click('[data-action="document"]')`]},
 scheduling:{hash:'scheduling'},
 mcp:{hash:'settings/mcp',steps:[`[...document.querySelectorAll('*')].filter(e=>!e.children.length&&/127\\.0\\.0\\.1:\\d+/.test(e.textContent)).forEach(e=>e.textContent=e.textContent.replace(/http:\\/\\/127\\.0\\.0\\.1:\\d+/,'https://runonthrive.com'))`]},
 'client-proposal':{path:'/share/document.doc-p1',w:1120},
 'client-contract':{path:'/share/contract.latest',w:1120},
 'client-invoice':{path:'/share/invoice.latest',w:1120},
};

async function cdp(url){
 const ws=new WebSocket(url);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
 let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {res,rej}=pending.get(m.id);pending.delete(m.id);m.error?rej(Error(m.error.message)):res(m.result);}};
 return {send:(method,params={})=>new Promise((res,rej)=>{const i=++id;pending.set(i,{res,rej});ws.send(JSON.stringify({id:i,method,params}));}),close:()=>ws.close()};
}

const langs=process.argv.slice(2).length?process.argv.slice(2):LANGUAGES.map(l=>l.code);
const profile=mkdtempSync(path.join(tmpdir(),'thrive-blog-shots-'));
const browser=spawn(chrome,['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb',`--remote-debugging-port=${DEBUG}`,`--user-data-dir=${profile}`,`--window-size=${W},${H}`,'about:blank'],{stdio:'ignore'});
let server;
try{
 let page;for(let i=0;i<50&&!page;i++){await sleep(200);try{page=(await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json()).find(t=>t.type==='page');}catch{}}
 const c=await cdp(page.webSocketDebuggerUrl);
 await c.send('Page.enable');await c.send('Runtime.enable');
 await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'},{name:'prefers-reduced-motion',value:'reduce'}]});
 const evaluate=async expr=>{const r=await c.send('Runtime.evaluate',{expression:expr,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 let n=0;
 for(const lang of langs){
  server=spawn(process.execPath,['scripts/design-preview.mjs'],{cwd:root,env:{...process.env,THRIVE_SHOWCASE:'1',THRIVE_LANGUAGE:lang,PORT:String(PORT)},stdio:['ignore','pipe','inherit']});
  await new Promise(res=>server.stdout.on('data',d=>{if(String(d).includes('http://'))res();}));
  const script=await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`try{localStorage.setItem('thrive-theme','light');localStorage.setItem('thrive-language',${JSON.stringify(lang)})}catch{}`});
  const out=path.join(root,'public/blog-shots',lang);mkdirSync(out,{recursive:true});
  const only=String(process.env.SHOTS||'').split(',').filter(Boolean);
  for(const [name,shot] of Object.entries(shots)){
   if(only.length&&!only.includes(name))continue;
   try{
    await c.send('Emulation.setDeviceMetricsOverride',{width:shot.w||W,height:H,deviceScaleFactor:2,mobile:false});
    await c.send('Page.navigate',{url:shot.path?`http://127.0.0.1:${PORT}${shot.path}?shot=${n++}`:`http://127.0.0.1:${PORT}/?shot=${n++}#${shot.hash}`});
    await sleep(2400);
    await evaluate(helpers);
    if(!shot.keepTimer)await evaluate(`document.head.insertAdjacentHTML('beforeend','<style>#running-timer{display:none!important}</style>')`);
    for(const step of shot.steps||[]){await evaluate(`(async()=>{${step}})()`);await sleep(800);}
    await evaluate(`document.activeElement?.blur?.();0`);
    await sleep(400);
    const {data}=await c.send('Page.captureScreenshot',{format:'png'});
    const png=path.join(profile,`${lang}-${name}.png`);writeFileSync(png,Buffer.from(data,'base64'));
    execFileSync('magick',[png,'-resize',`${Math.round((shot.w||W)*1.1)}x`,'-quality','80',path.join(out,name+'.webp')]);
    console.log('✓',lang,name);
   }catch(error){console.log('✗',lang,name,error.message);}
  }
  await c.send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
  server.kill();server=null;await sleep(600);
 }
 c.close();
}finally{browser.kill();server?.kill();await sleep(800);try{rmSync(profile,{recursive:true,force:true});}catch{}}
const dir=path.join(root,'public/blog-shots'),files=[];
if(existsSync(dir))for(const lang of readdirSync(dir))for(const f of readdirSync(path.join(dir,lang)))if(f.endsWith('.webp'))files.push(`${lang}/${f.slice(0,-5)}`);
writeFileSync(path.join(root,'content/blog/shots.json'),JSON.stringify({files:files.sort()},null,1)+'\n');
console.log(files.length,'screenshots listed in content/blog/shots.json');
