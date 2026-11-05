// Isolated design exploration: fictional sample records, memory-only changes,
// no accounts, external providers, database writes, or outbound deliveries.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {seed} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {initScheduling} from '../public/scheduling-domain.js';
import {initWorkflows} from '../public/workflow-domain.js';

await import('./build-fluid.mjs');
const root=fileURLToPath(new URL('../',import.meta.url));
let state=upgradeWorkspace(seed()),revision=1;
initScheduling(state,'Europe/Lisbon');
initWorkflows(state);
// THRIVE_SHOWCASE=1: richer fictional data, a connected calendar and no preview banner, for landing page screenshots.
const showcase=process.env.THRIVE_SHOWCASE==='1';
const {showcaseWorkspace,showcaseEvents}=showcase?await import('./showcase-data.mjs'):{};
if(showcase)showcaseWorkspace(state);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(url.pathname.startsWith('/api/')){
  if(url.pathname==='/api/auth')return json({enabled:false,mode:'design-preview',user:null,providers:{}});
  if(url.pathname==='/api/workspaces')return json({workspaceId:'default',profile:state.settings,workspaces:[]});
  if(url.pathname==='/api/workspace'){
   if(req.method==='GET')return json(url.searchParams.has('revision')?{revision}:{initialized:true,state,revision});
   if(req.method==='PUT'){
    let body='';for await(const chunk of req){body+=chunk;if(body.length>5_000_000)return json({error:'Preview data is too large.'},413);}
    try{const data=JSON.parse(body);if(data.expected_revision!==revision)return json({error:'The preview changed. Reload to continue.'},409);state=data.state;revision++;return json({state,revision});}catch{return json({error:'Invalid preview data.'},400);}
   }
  }
  if(showcase&&url.pathname==='/api/communications'){
   if(req.method==='GET')return json({connection:{provider:'nylas',configured:true,account:{email:'alex@morgan.example',calendar:true,gmail:false}},threads:[]});
   return json({events:showcaseEvents(),nextCursor:null});
  }
  if(showcase&&url.pathname==='/api/scheduler')return json({connection:{provider:'nylas',configured:true,account:{email:'alex@morgan.example',calendar:true}},pages:Object.fromEntries(state.scheduling.types.map(t=>[t.id,{published:true,url:'https://thrivehq.com/book/morgan-studio/'+t.id}])),meetings:[]});
  if(url.pathname==='/api/communications'&&req.method==='GET')return json({connection:{provider:'none',account:null,configured:false},threads:[]});
  return json({error:'This isolated design preview has no external connections.'},503);
 }
 try{
  const name=decodeURIComponent(url.pathname);
  const pages={'/':'ui/index.html','/landing':'ui/landing.html','/privacy':'ui/privacy.html','/terms':'ui/terms.html'};
  const file=pages[name]?path.join(root,pages[name]):path.resolve(root,'public','.'+name);
  if(!pages[name]&&!file.startsWith(path.join(root,'public')+path.sep))return json({error:'Not found'},404);
  let data=await readFile(file);
  if(name==='/'&&!showcase)data=Buffer.from(data.toString().replace('<body>','<body><div class="design-preview-notice" role="status">Design exploration <span>Fictional sample data · changes last until this preview restarts</span></div>'));
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PORT)||4174;
server.listen(port,'127.0.0.1',()=>console.log(`Thrive ${showcase?'showcase':'design exploration'}: http://127.0.0.1:${port}/`));
