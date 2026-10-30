import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {directory,createWorkspace,listWorkspaces,saveAccountProfile,resolveWorkspace,workspaceOwner,resolveCallbackWorkspace} from '../server/workspace-directory.mjs';
import {bootstrap,loadWorkspace,hashRequest} from '../server/store.mjs';
import {emptyWorkspace} from '../server/account-workspace.mjs';
import {withRuntime} from '../server/runtime.mjs';
import {ownerOf,json} from '../server/http.mjs';
function database(){const sql=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));return {prepare(query){let args=[];return {bind(...v){args=v;return this;},first(){return sql.prepare(query).get(...args)||null;},all(){return {results:sql.prepare(query).all(...args)};},run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}};},batch(statements){sql.exec('BEGIN');try{const r=statements.map(s=>s.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}},close(){sql.close();}};}

const alice={owner:'alice',name:'Alice',business:'Original studio'},bob={owner:'bob',name:'Bob'};
test('new workspaces are empty, durable, idempotent, and isolated from other accounts',async()=>{
 const db=database();try{
 const original=emptyWorkspace(alice);original.settings.workspaceLogo='data:image/png;base64,AAAA';await bootstrap(db,alice.owner,original);
 const id=crypto.randomUUID();await createWorkspace(db,alice,{id,name:'Second studio',currency:'EUR'});await createWorkspace(db,alice,{id,name:'Second studio',currency:'EUR'});
 const list=await listWorkspaces(db,alice);assert.equal(list.workspaces.length,2);assert.equal(list.workspaces[0].logo,original.settings.workspaceLogo);
 const owner=await resolveWorkspace(db,alice,id),child=await loadWorkspace(db,owner);assert.equal(child.state.settings.business,'Second studio');assert.equal(child.state.settings.currency,'EUR');assert.equal(child.state.clients.length,0);assert.equal(child.state.documents.length,0);assert.equal(child.state.automation.workflows.length,0);assert.equal(child.state.settings.workspaceLogo,undefined);
 assert.deepEqual((await loadWorkspace(db,alice.owner)).state,original);await assert.rejects(()=>resolveWorkspace(db,bob,id),/not found/);await assert.rejects(()=>resolveWorkspace(db,alice,'alice:workspace-directory'),/not found/);
 const profile={name:'Alice Updated',profilePhoto:'data:image/png;base64,AAAA'};await saveAccountProfile(db,alice,profile);assert.deepEqual((await listWorkspaces(db,alice)).profile,profile);assert.equal((await listWorkspaces(db,bob)).profile.name,'Bob');
 }finally{db.close();}
});
test('runtime validates workspace ownership for reads, writes and download URLs',async()=>{
 const db=database();try{const id=crypto.randomUUID();await createWorkspace(db,alice,{id,name:'Second',currency:'USD'});
 for(const method of ['GET','PUT']){const headers={'oai-authenticated-user-id':'alice','oai-authenticated-user-email':'alice@example.test','x-thrive-workspace':id};const result=await withRuntime(new Request('https://thrive.test/api/workspace',{method,headers}),{DB:db},async({request,user})=>json({account:user.owner,workspace:ownerOf(request)}));assert.deepEqual(await result.json(),{account:'alice',workspace:workspaceOwner('alice',id)});headers['oai-authenticated-user-id']='bob';assert.equal((await withRuntime(new Request('https://thrive.test/api/workspace',{method,headers}),{DB:db},async()=>json({}))).status,404);}
 const result=await withRuntime(new Request('https://thrive.test/api/form-files/example?workspace='+id,{headers:{'oai-authenticated-user-id':'alice','oai-authenticated-user-email':'a@test.dev'}}),{DB:db},async({request})=>json({owner:ownerOf(request)}));assert.equal((await result.json()).owner,workspaceOwner('alice',id));
 }finally{db.close();}
});
test('OAuth callbacks recover the selected workspace from one-time state and reject other accounts',async()=>{
 const db=database();try{const id=crypto.randomUUID();await createWorkspace(db,alice,{id,name:'Second',currency:'USD'});
 for(const provider of ['google','nylas']){const token=crypto.randomUUID();await db.prepare(`INSERT INTO ${provider}_oauth_states(hash,owner_id,payload,expires_at) VALUES(?,?,?,?)`).bind(await hashRequest(token),workspaceOwner('alice',id),'encrypted',Date.now()+60000).run();const url=new URL(`https://thrive.test/api/${provider}/callback?state=${token}`);assert.equal(await resolveCallbackWorkspace(db,alice,url),id);await assert.rejects(()=>resolveCallbackWorkspace(db,bob,url),/another account/);}
 }finally{db.close();}
});
test('workspace creation and shared profile reject malformed inputs',async()=>{const db=database();try{for(const input of [{id:'default',name:'Studio',currency:'USD'},{id:crypto.randomUUID(),name:' ',currency:'USD'},{id:crypto.randomUUID(),name:'Studio',currency:'bad'}])await assert.rejects(()=>createWorkspace(db,alice,input));await assert.rejects(()=>saveAccountProfile(db,alice,{name:'Alice',profilePhoto:'https://example.test/photo.svg'}));assert.equal((await directory(db,alice)).state.workspaceIds.length,1);}finally{db.close();}});
