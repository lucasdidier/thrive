import test from 'node:test';
import assert from 'node:assert/strict';
import {runBackup} from '../server/backup.mjs';
import {readBackup,checkBackup,nonEmptyTables,restoreBackup,verifyRestore,RESTORE_ORDER} from '../server/restore.mjs';
import {encodeState,decodeState} from '../server/store.mjs';

const U1='0f8f2a3e-1111-4c1e-9a10-000000000001',U2='0f8f2a3e-2222-4c1e-9a10-000000000002';
const hex=bytes=>'\\x'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
// A Supabase admin client over in-memory tables, enough for backup.mjs and restore.mjs.
function supabase({tables={},users=[],files={},keepIds=true}={}){
 const db=Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.map(r=>({...r}))])),stored=new Map(Object.entries(files));let nextEvent=1000;
 return {db,users,stored,
  from(name){const t=name.replace(/^thrive_/,'');return {
   select(_cols,opts){if(opts?.head)return Promise.resolve({count:(db[t]||[]).length,error:null});return {order:()=>({range:(a,b)=>Promise.resolve({data:(db[t]||[]).slice(a,b+1),error:null})})};},
   insert(rows){db[t]??=[];for(const r of rows)db[t].push(t==='events'?{id:nextEvent++,...r}:{...r});return Promise.resolve({error:null});},
  };},
  auth:{admin:{
   listUsers:async({page,perPage})=>({data:{users:users.slice((page-1)*perPage,page*perPage)},error:null}),
   createUser:async({id,email,app_metadata})=>{const user={id:keepIds?id:'99999999-9999-4999-9999-999999999999',email,app_metadata};users.push(user);return {data:{user},error:null};},
  }},
  storage:{from:()=>({download:async k=>stored.has(k)?{data:new Blob([stored.get(k)])}:{data:null,error:{message:'not found'}},upload:async(k,body)=>{stored.set(k,body);return {error:null};}})},
 };
}
async function source(){
 return supabase({
  users:[{id:U1,email:'sam@example.test',app_metadata:{provider:'google',thrive_beta:true}},{id:U2,email:'ana@example.test',app_metadata:{provider:'email'}}],
  tables:{
   workspaces:[{owner_id:'supabase:'+U1,revision:7,state:hex(await encodeState({clients:[{name:'Juniper Studio'}]})),updated_at:'2026-11-09'},{owner_id:`supabase:${U2}:workspace:studio`,revision:2,state:hex(await encodeState({clients:[]})),updated_at:'2026-11-08'}],
   events:[{id:5,owner_id:'supabase:'+U1,revision:7,type:'b'},{id:3,owner_id:'supabase:'+U1,revision:6,type:'a'}],
   form_uploads:[{id:'f1',owner_id:'supabase:'+U1,object_key:'o/f1',status:'ready',name:'brief.pdf'}],
   google_oauth_states:[{hash:'h',owner_id:'supabase:'+U1,payload:'x',expires_at:1}],
   beta_invites:[{email:'sam@example.test',emailed_at:'2026-11-06'}],
   subscriptions:[{owner_id:'supabase:'+U1,email:'sam@example.test',trial_ends_at:'2026-11-17',comped:true}],
  },
  files:{'o/f1':'PDF'},
 });
}
async function nightly(admin){
 const objects=new Map(),bucket={head:async k=>objects.has(k)?{}:null,put:async(k,v)=>{objects.set(k,v);}};
 const r=await runBackup({BACKUPS:bucket,SUPABASE_URL:'https://prod.supabase.co'},{admin,now:new Date('2026-11-10T03:00:00Z')});
 return {bytes:new Uint8Array(objects.get(r.key)),objects};
}

test('a nightly backup restores into an empty project and matches it table by table',async()=>{
 const src=await source(),{bytes,objects}=await nightly(src),data=await readBackup(bytes);
 const summary=await checkBackup(data);
 assert.deepEqual(summary.problems,[]);assert.equal(summary.workspaces,2);assert.equal(summary.accounts,2);assert.equal(summary.counts.subscriptions,1);assert.deepEqual(summary.notInBackup,[]);
 const target=supabase();assert.deepEqual(await nonEmptyTables(target),[]);
 const files=new Map([...objects].filter(([k])=>k.startsWith('files/')).map(([k,v])=>[k.slice(6),v]));
 const report=await restoreBackup(data,{admin:target,readFile:async k=>files.get(k)||null});
 assert.equal(report.accounts.created,2);assert.equal(report.files.uploaded,1);
 assert.deepEqual(await verifyRestore(data,target),[]);
 // Same account ids, so the workspace still belongs to its account and decodes.
 assert.equal(target.users.find(u=>u.email==='sam@example.test').id,U1);assert.equal(target.users[0].app_metadata.thrive_beta,true);
 const row=target.db.workspaces.find(w=>w.owner_id==='supabase:'+U1);
 assert.equal((await decodeState(Uint8Array.from(row.state.slice(2).match(/../g),h=>parseInt(h,16)))).clients[0].name,'Juniper Studio');
 // Events keep their order with new ids; one-time OAuth states stay out; billing comes back.
 assert.deepEqual(target.db.events.map(e=>e.type),['a','b']);
 assert.equal(target.db.google_oauth_states,undefined);
 assert.equal(target.db.subscriptions[0].comped,true);
});

test('a restore refuses a project that already has data, and stops when Supabase changes an account id',async()=>{
 const data=await readBackup((await nightly(await source())).bytes);
 assert.deepEqual(await nonEmptyTables(supabase({tables:{workspaces:[{owner_id:'x'}]}})),['thrive_workspaces (1 rows)']);
 const renumbering=supabase({keepIds:false});
 await assert.rejects(restoreBackup(data,{admin:renumbering}),/new id instead of/);
 assert.equal(renumbering.db.workspaces,undefined);
 const clash=supabase({users:[{id:U1,email:'someone-else@example.test'}]});
 await assert.rejects(restoreBackup(data,{admin:clash}),/different email/);
});

test('the check catches a damaged workspace, an orphaned one, and a file that is not a backup',async()=>{
 const data=await readBackup((await nightly(await source())).bytes);
 data.tables.workspaces[0].state='\\x00ff';data.tables.workspaces.push({owner_id:'supabase:0f8f2a3e-3333-4c1e-9a10-000000000003',state:data.tables.workspaces[1].state});
 const {problems}=await checkBackup(data);
 assert.equal(problems.length,2);assert.match(problems[0],/does not decode/);assert.match(problems[1],/account is not in the backup/);
 await assert.rejects(readBackup(new TextEncoder().encode('hello')),/not valid JSON/);
 await assert.rejects(readBackup(new TextEncoder().encode('{"version":2}')),/version 1/);
 // An unpacked download reads the same as the gzipped file.
 assert.equal((await readBackup(new TextEncoder().encode(JSON.stringify({version:1,accounts:[],tables:{}})))).version,1);
 assert.ok(RESTORE_ORDER.includes('subscriptions'));
});
