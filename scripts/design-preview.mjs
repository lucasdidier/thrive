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
import {portalEntry} from '../public/portal-domain.js';

await import('./build-fluid.mjs');
const root=fileURLToPath(new URL('../',import.meta.url));
let state=upgradeWorkspace(seed()),revision=1;
initScheduling(state,'Europe/Lisbon');
initWorkflows(state);
// THRIVE_SHOWCASE=1: richer fictional data, a connected calendar and no preview banner, for landing page screenshots.
const showcase=process.env.THRIVE_SHOWCASE==='1';
const {showcaseWorkspace,showcaseEvents,showcaseThreads}=showcase?await import('./showcase-data.mjs'):{};
const {clientProjection}=showcase?await import('../server/sharing.mjs'):{};
if(showcase)showcaseWorkspace(state);
// THRIVE_FRESH=1: an empty new account's workspace, which opens in onboarding.
if(process.env.THRIVE_FRESH==='1'){const {emptyWorkspace}=await import('../server/account-workspace.mjs');state=emptyWorkspace({});}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(url.pathname.startsWith('/api/')){
  if(url.pathname==='/api/auth')return json({enabled:false,mode:'design-preview',user:null,providers:{}});
  if(url.pathname==='/api/workspaces'&&req.method==='PATCH'){let body='';for await(const chunk of req)body+=chunk;const p=JSON.parse(body||'{}');state.settings={...state.settings,name:String(p.name||state.settings.name),profilePhoto:String(p.profilePhoto??state.settings.profilePhoto??'')};return json({profile:{name:state.settings.name,profilePhoto:state.settings.profilePhoto}});}
  if(url.pathname==='/api/workspaces')return json({workspaceId:'default',profile:state.settings,workspaces:[]});
  if(url.pathname==='/api/workspace'){
   if(req.method==='GET')return json(url.searchParams.has('revision')?{revision}:{initialized:true,state,revision});
   if(req.method==='PUT'){
    let body='';for await(const chunk of req){body+=chunk;if(body.length>5_000_000)return json({error:'Preview data is too large.'},413);}
    try{const data=JSON.parse(body);if(data.expected_revision!==revision)return json({error:'The preview changed. Reload to continue.'},409);state=data.state;revision++;return json({state,revision});}catch{return json({error:'Invalid preview data.'},400);}
   }
  }
  if(showcase&&url.pathname==='/api/communications'){
   if(req.method==='GET')return json({connection:{provider:'nylas',configured:true,account:{email:'alex@morgan.example',calendar:true,gmail:true,lastSync:new Date(Date.now()-6*60000).toISOString()}},threads:showcaseThreads(state),operations:[]});
   return json({events:showcaseEvents(),nextCursor:null});
  }
  if(showcase&&url.pathname==='/api/scheduler')return json({connection:{provider:'nylas',configured:true,account:{email:'alex@morgan.example',calendar:true}},pages:Object.fromEntries(state.scheduling.types.map(t=>[t.id,{published:true,url:'https://runonthrive.com/book/morgan-studio/'+t.id}])),meetings:[]});
  // Showcase only: the real client pages for a record, at /share/<entity>.<id> (read-only).
  if(showcase&&url.pathname.startsWith('/api/shared/')&&req.method==='GET'){
   try{
    let [entity,recordId]=decodeURIComponent(url.pathname.slice(12)).split('.');
    if(entity==='contract'){entity='document';recordId=state.documents.find(d=>d.kind==='contract'&&d.status!=='draft')?.id;}
    if(entity==='invoice'&&recordId==='latest')recordId=state.invoices.find(i=>i.number&&i.items?.length>1)?.id;
    const doc=entity==='document'?state.documents.find(d=>d.id===recordId):null;
    let link={entity,recordId,version:doc?.currentVersion};const item=url.searchParams.get('item');
    if(item&&entity==='portal'){const e=portalEntry(state,recordId,item);link={entity:e.entity,recordId:e.recordId,version:e.version};}
    const result=clientProjection(state,link);if(entity==='portal'&&!item)result.portal=true;
    return json({...result,actions:[]});
   }catch(e){return json({error:e.message},404);}
  }
  // A Thrive Cloud trial (THRIVE_PLAN=trial or last-day) can't connect email & calendar until it subscribes.
  if(url.pathname==='/api/communications'&&req.method==='GET')return json({connection:['trial','last-day'].includes(process.env.THRIVE_PLAN)?{provider:'nylas',account:null,configured:true,requiresPlan:true}:{provider:'none',account:null,configured:false},threads:[]});
  // THRIVE_PLAN=trial|last-day|past_due|active|canceling|comped|expired|ended previews Thrive Cloud billing.
  if(url.pathname==='/api/billing'){
   const plan=process.env.THRIVE_PLAN;if(!plan)return json({enabled:false});
   const day=n=>new Date(Date.now()+n*86400000).toISOString();
   const access={trial:{state:'trial',locked:false,trialEndsAt:day(4.5),daysLeft:5,lastDay:false},'last-day':{state:'trial',locked:false,trialEndsAt:day(.4),daysLeft:1,lastDay:true},past_due:{state:'past_due',locked:false,renewsAt:day(27)},active:{state:'active',locked:false,renewsAt:day(27)},canceling:{state:'canceling',locked:false,endsAt:day(12)},comped:{state:'comped',locked:false},expired:{state:'expired',locked:true,trialEndsAt:day(-2)},ended:{state:'ended',locked:true}}[plan];
   if(req.method==='POST')return json({error:'The design preview has no billing provider.'},503);
   if(url.searchParams.has('export'))return json({error:'The design preview has no account data to export.'},503);
   return json({enabled:true,owner:'preview',email:'alex@morgan.example',access,price:'$10 / month',plans:[{id:'month',priceId:'pri_preview_month',label:'$10 / month',saving:0},{id:'year',priceId:'pri_preview_year',label:'$100 / year',saving:17}],interval:['active','canceling','past_due'].includes(plan)?'month':null,billing:['active','canceling','past_due'].includes(plan),support:'hello@runonthrive.com',paddle:null});
  }
  return json({error:'This isolated design preview has no external connections.'},503);
 }
 try{
  const name=decodeURIComponent(url.pathname);
  const pages={'/':'ui/index.html','/landing':'ui/landing.html','/privacy':'ui/privacy.html','/terms':'ui/terms.html'};
  if(showcase&&name.startsWith('/share/'))pages[name]='ui/client.html';
  const file=pages[name]?path.join(root,pages[name]):path.resolve(root,'public','.'+name);
  if(!pages[name]&&!file.startsWith(path.join(root,'public')+path.sep))return json({error:'Not found'},404);
  let data=await readFile(file);
  if(name==='/'&&!showcase)data=Buffer.from(data.toString().replace('<body>','<body><div class="design-preview-notice" role="status">Design exploration <span>Fictional sample data · changes last until this preview restarts</span></div>'));
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
const port=Number(process.env.PORT)||4174;
server.listen(port,'127.0.0.1',()=>console.log(`Thrive ${showcase?'showcase':'design exploration'}: http://127.0.0.1:${port}/`));
