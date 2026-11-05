// Captures the landing page screenshots from the showcase preview (fictional data).
//   node scripts/landing-shots.mjs            all shots
//   node scripts/landing-shots.mjs time mcp   only these
//   THEME=dark node scripts/landing-shots.mjs  dark app theme, written as <name>-dark.webp
// Starts its own showcase server and headless Chrome; writes public/landing/<name>.webp.
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const chrome=process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT=4176,DEBUG=9336,W=1440,H=900,THEME=process.env.THEME==='dark'?'dark':'light',SUFFIX=THEME==='dark'?'-dark':'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// Page helpers, injected before each shot's steps.
const helpers=`window.__click=(sel,text)=>{const el=[...document.querySelectorAll(sel)].find(e=>!text||e.textContent.trim().includes(text));if(!el)throw Error('Missing '+sel+' '+(text||''));el.click();};`;
const shots={
 overview:{hash:'overview'},
 event:{hash:'overview',hideTimer:true,steps:[`__click('[data-calendar-event="e2"]')`]},
 project:{hideTimer:true,hash:'projects/p1'},
 invoice:{hideTimer:true,hash:'invoices',steps:[`__click('button','INV-006')`,`__click('.dialog-footer .icon-btn, .dialog-footer button[aria-label*="More"]')`,`__click('button','Client preview')`]},
 time:{hash:'time'},
 clients:{hideTimer:true,hash:'clients'},
 forms:{hideTimer:true,hash:'forms',steps:[`__click('button','Submissions')`]},
 workflows:{hideTimer:true,hash:'workflows'},
 proposal:{hideTimer:true,hash:'proposals',steps:[`document.querySelector('[data-action="document"][data-id="doc-p1"]').click()`,`document.querySelector('[data-action="doc-client"]').click()`]},
 scheduling:{hideTimer:true,hash:'scheduling'},
 contracts:{hideTimer:true,hash:'contracts',steps:[`document.querySelector('[data-action="document"]').click()`]},
 emails:{hideTimer:true,hash:'messages'},
 builder:{hideTimer:true,hash:'workflows',steps:[`document.querySelector('[data-action="wf-edit"]').click()`]},
 // The pages clients open from a link (real client view, fictional data).
 'client-proposal':{path:'/share/document.doc-p1',w:1120,h:900},
 'client-contract':{path:'/share/contract.latest',w:1120,h:900},
 'client-invoice':{path:'/share/invoice.latest',w:1120,h:900},
 'client-portal':{path:'/share/portal.c1',w:1120,h:900},
 mcp:{hideTimer:true,hash:'settings/mcp',steps:[`document.querySelectorAll('code,.mcp-endpoint,[class*=endpoint]').forEach(e=>{e.textContent=e.textContent.replace(/http:\\/\\/127\\.0\\.0\\.1:\\d+/,'https://thrivehq.com')});[...document.querySelectorAll('*')].filter(e=>!e.children.length&&/127\\.0\\.0\\.1:\\d+/.test(e.textContent)).forEach(e=>e.textContent=e.textContent.replace(/http:\\/\\/127\\.0\\.0\\.1:\\d+/,'https://thrivehq.com'))`]},
};

async function cdp(url){
 const ws=new WebSocket(url);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
 let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {res,rej}=pending.get(m.id);pending.delete(m.id);m.error?rej(Error(m.error.message)):res(m.result);}};
 return {send:(method,params={})=>new Promise((res,rej)=>{const i=++id;pending.set(i,{res,rej});ws.send(JSON.stringify({id:i,method,params}));}),close:()=>ws.close()};
}

const server=spawn(process.execPath,['scripts/design-preview.mjs'],{cwd:root,env:{...process.env,THRIVE_SHOWCASE:'1',PORT:String(PORT)},stdio:['ignore','pipe','inherit']});
await new Promise(res=>server.stdout.on('data',d=>{if(String(d).includes('http://'))res();}));
const profile=mkdtempSync(path.join(tmpdir(),'thrive-shots-'));
const browser=spawn(chrome,['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb',`--remote-debugging-port=${DEBUG}`,`--user-data-dir=${profile}`,`--window-size=${W},${H}`,'about:blank'],{stdio:'ignore'});
try{
 let page;for(let i=0;i<50&&!page;i++){await sleep(200);try{page=(await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json()).find(t=>t.type==='page');}catch{}}
 const c=await cdp(page.webSocketDebuggerUrl);
 await c.send('Page.enable');await c.send('Runtime.enable');
 await c.send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:2,mobile:false});
 await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:THEME},{name:'prefers-reduced-motion',value:'reduce'}]});
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`try{localStorage.setItem('thrive-theme','${THEME}')}catch{}`});
 const evaluate=async expr=>{const r=await c.send('Runtime.evaluate',{expression:expr,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const only=process.argv.slice(2);
 let n=0;
 for(const [name,shot] of Object.entries(shots)){
  if(only.length&&!only.includes(name))continue;
  await c.send('Emulation.setDeviceMetricsOverride',{width:shot.w||W,height:shot.h||H,deviceScaleFactor:2,mobile:false});
  await c.send('Page.navigate',{url:shot.path?`http://127.0.0.1:${PORT}${shot.path}?shot=${n++}`:`http://127.0.0.1:${PORT}/?shot=${n++}#${shot.hash}`});
  await sleep(2200);
  await evaluate(helpers);
  if(shot.hideTimer)await evaluate(`document.head.insertAdjacentHTML('beforeend','<style>#running-timer{display:none!important}</style>')`);
  for(const step of shot.steps||[]){await evaluate(step);await sleep(700);}
  await evaluate(`document.activeElement?.blur?.();document.querySelectorAll(':hover').length`);
  await sleep(500);
  const {data}=await c.send('Page.captureScreenshot',{format:'png'});
  const png=path.join(profile,name+'.png');writeFileSync(png,Buffer.from(data,'base64'));
  execFileSync('magick',[png,'-resize',`${Math.round((shot.w||W)*1.25)}x`,'-quality','84',path.join(root,'public/landing',name+SUFFIX+'.webp')]);
  console.log('✓',name);
 }
 c.close();
}finally{browser.kill();server.kill();await sleep(800);try{rmSync(profile,{recursive:true,force:true});}catch{}}
