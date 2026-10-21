import {loadWorkspace,hashRequest,StoreError} from './store.mjs';
import {adminClient,SupabaseDatabase} from './supabase-store.mjs';
import {readBody,json,errorResponse} from './http.mjs';

// Deployment-only bridge. Disabled after cutover and whenever its one-use
// runtime secret is absent. The original D1/R2 data is never modified.
export async function handleAccountMigration(request,env){
 try {
  const secret=env.THRIVE_MIGRATION_KEY;
  if(!secret || env.THRIVE_AUTH_MODE==='supabase' || request.method!=='POST')return json({error:'Not found'},404);
  const supplied=request.headers.get('authorization')||'';
  if(await hashRequest(supplied)!==await hashRequest('Bearer '+secret))return json({error:'Not found'},404);
  const body=await readBody(request,4000);
  const rows=(await env.DB.prepare('SELECT owner_id,revision,updated_at FROM workspaces').all()).results;
  if(rows.length!==1)throw new StoreError('Migration requires an explicitly isolated source workspace.',409);
  const source=rows[0];
  const snapshot=await loadWorkspace(env.DB,source.owner_id);
  const uploads=(await env.DB.prepare('SELECT * FROM form_uploads WHERE owner_id=?').bind(source.owner_id).all()).results;
  const counts=Object.fromEntries(['clients','projects','documents','invoices','forms','submissions','time'].map(k=>[k,snapshot.state[k]?.length||0]));
  if(body.action==='inspect')return json({sourceOwner:source.owner_id,revision:snapshot.revision,counts,uploads:uploads.length,uploadBytes:uploads.reduce((n,u)=>n+u.size,0)});
  if(body.action!=='migrate'||body.sourceOwner!==source.owner_id||body.expectedRevision!==snapshot.revision)throw new StoreError('Review the current source workspace before migration.',409);
  if(!/^[a-f0-9-]{36}$/.test(body.destinationId||'')||!env.THRIVE_MIGRATION_EMAIL)throw new StoreError('Destination is not configured.',400);
  const client=adminClient(env),db=new SupabaseDatabase(client);
  const {data,error}=await client.auth.admin.getUserById(body.destinationId);
  if(error||data.user?.email?.toLowerCase()!==env.THRIVE_MIGRATION_EMAIL.toLowerCase())throw new StoreError('Destination account does not match the approved email.',409);
  const owner='supabase:'+data.user.id;
  if(await db.loadWorkspace(owner))throw new StoreError('Destination already has a workspace; refusing to overwrite it.',409);
  const connections=await env.DB.prepare('SELECT owner_id FROM google_connections WHERE owner_id=?').bind(source.owner_id).first();
  if(connections)throw new StoreError('Disconnect the legacy Google integration before migration.',409);
  const check=async result=>{const r=await result;if(r.error)throw new StoreError('Migration storage operation failed.',503);return r.data;};
  // Sequential copies bound memory to a single file. Stable keys make retries
  // safe; no public file policy is created and the snapshot is published last.
  for(const upload of uploads){
   if(upload.status!=='ready')continue;
   const file=await env.BUCKET.get(upload.object_key);
   if(!file)throw new StoreError('A source attachment is missing; migration stopped.',409);
   await check(client.storage.from('thrive-files').upload(upload.object_key,await new Response(file.body).arrayBuffer(),{upsert:true,contentType:'application/octet-stream'}));
   await check(client.from('thrive_form_uploads').upsert({...upload,owner_id:owner},{onConflict:'id'}));
  }
  for(const table of ['receipts','mail_threads','provider_operations']){
   const records=(await env.DB.prepare(`SELECT * FROM ${table} WHERE owner_id=?`).bind(source.owner_id).all()).results;
   for(let i=0;i<records.length;i+=100)await check(client.from('thrive_'+table).upsert(records.slice(i,i+100).map(r=>({...r,owner_id:owner}))));
  }
  const events=(await env.DB.prepare('SELECT * FROM events WHERE owner_id=? ORDER BY id').bind(source.owner_id).all()).results;
  await check(client.from('thrive_events').delete().eq('owner_id',owner));
  for(let i=0;i<events.length;i+=100)await check(client.from('thrive_events').insert(events.slice(i,i+100).map(({id,...event})=>({...event,owner_id:owner}))));
  const current=await loadWorkspace(env.DB,source.owner_id);
  if(current.revision!==snapshot.revision)throw new StoreError('The source changed during migration. Review and retry.',409);
  await db.bootstrap(owner,snapshot.state);
  await check(client.from('thrive_workspaces').update({revision:snapshot.revision,updated_at:snapshot.updatedAt}).eq('owner_id',owner));
  const destination=await db.loadWorkspace(owner);
  if(await hashRequest(destination.state)!==await hashRequest(snapshot.state))throw new StoreError('Workspace verification failed.',503);
  return json({ok:true,destinationOwner:owner,revision:destination.revision,counts,uploads:uploads.filter(u=>u.status==='ready').length,verified:true});
 }catch(error){return errorResponse(error);}
}
