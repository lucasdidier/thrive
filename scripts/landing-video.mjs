// Records a short, real clip of the showcase app (fictional data) for the landing page:
// the Time page with the timer running. Writes public/landing/time-live.mp4 and a matching
// poster, public/landing/time-live.webp (THEME=dark adds -dark to both names).
//   node scripts/landing-video.mjs
// Needs Chrome and ffmpeg. Starts its own showcase server, like landing-shots.mjs.
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const chrome=process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT=4177,DEBUG=9337,W=1440,H=900,SCALE=1.25,FPS=4,SECONDS=9,THEME=process.env.THEME==='dark'?'dark':'light',SUFFIX=THEME==='dark'?'-dark':'';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function cdp(url){
 const ws=new WebSocket(url);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
 let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {res,rej}=pending.get(m.id);pending.delete(m.id);m.error?rej(Error(m.error.message)):res(m.result);}};
 return {send:(method,params={})=>new Promise((res,rej)=>{const i=++id;pending.set(i,{res,rej});ws.send(JSON.stringify({id:i,method,params}));}),close:()=>ws.close()};
}

const server=spawn(process.execPath,['scripts/design-preview.mjs'],{cwd:root,env:{...process.env,THRIVE_SHOWCASE:'1',PORT:String(PORT)},stdio:['ignore','pipe','inherit']});
await new Promise(res=>server.stdout.on('data',d=>{if(String(d).includes('http://'))res();}));
const work=mkdtempSync(path.join(tmpdir(),'thrive-video-'));
const browser=spawn(chrome,['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--force-color-profile=srgb',`--remote-debugging-port=${DEBUG}`,`--user-data-dir=${path.join(work,'profile')}`,`--window-size=${W},${H}`,'about:blank'],{stdio:'ignore'});
try{
 let page;for(let i=0;i<50&&!page;i++){await sleep(200);try{page=(await (await fetch(`http://127.0.0.1:${DEBUG}/json/list`)).json()).find(t=>t.type==='page');}catch{}}
 const c=await cdp(page.webSocketDebuggerUrl);
 await c.send('Page.enable');
 await c.send('Emulation.setDeviceMetricsOverride',{width:W,height:H,deviceScaleFactor:SCALE,mobile:false});
 await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:THEME},{name:'prefers-reduced-motion',value:'reduce'}]});
 await c.send('Page.addScriptToEvaluateOnNewDocument',{source:`try{localStorage.setItem('thrive-theme','${THEME}')}catch{}`});
 await c.send('Page.navigate',{url:`http://127.0.0.1:${PORT}/#time`});
 await sleep(2500);
 // The dock repeats the page's own timer; hide it so the clip shows one running timer.
 await c.send('Runtime.evaluate',{expression:`document.head.insertAdjacentHTML('beforeend','<style>#running-timer{display:none!important}</style>');document.activeElement?.blur?.()`});
 await sleep(400);
 const frames=FPS*SECONDS;
 for(let i=0;i<frames;i++){
  const t=Date.now();
  const {data}=await c.send('Page.captureScreenshot',{format:'png'});
  writeFileSync(path.join(work,`f${String(i).padStart(3,'0')}.png`),Buffer.from(data,'base64'));
  await sleep(Math.max(0,1000/FPS-(Date.now()-t)));
 }
 c.close();
 const out=path.join(root,`public/landing/time-live${SUFFIX}.mp4`);
 execFileSync('ffmpeg',['-y','-loglevel','error','-framerate',String(FPS),'-i',path.join(work,'f%03d.png'),'-vf','scale=1800:-2,fps=24,format=yuv420p','-c:v','libx264','-preset','slow','-crf','26','-movflags','+faststart','-an',out]);
 execFileSync('magick',[path.join(work,'f000.png'),'-resize','1800x','-quality','84',path.join(root,`public/landing/time-live${SUFFIX}.webp`)]);
 console.log(`✓ time-live${SUFFIX}.mp4`);
}finally{browser.kill();server.kill();await sleep(800);try{rmSync(work,{recursive:true,force:true});}catch{}}
