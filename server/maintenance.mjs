// Nightly clean-up so abuse and ordinary use don't grow storage forever (server/scheduled.mjs).
import {adminClient,supabaseBucket} from './supabase-store.mjs';
import {loadWorkspace} from './store.mjs';
import {SupabaseDatabase} from './supabase-store.mjs';
const DAY=864e5;

// Uploads to public forms that never became part of a submission (abandoned or abusive) are deleted after
// two days: their rows and stored files. A file counts as used when its id appears in the owner's workspace.
export async function pruneOrphanUploads(env,{admin,now=Date.now(),bucket}={}){
 if(env.THRIVE_DATA_BACKEND!=='supabase')return {skipped:true};
 admin??=adminClient(env);bucket??=supabaseBucket(admin);
 const {data,error}=await admin.from('thrive_form_uploads').select('id,owner_id,object_key').lt('created_at',now-2*DAY).order('created_at').limit(300);
 if(error)throw Error('Unable to list uploads.');
 const byOwner=new Map();for(const u of data||[])(byOwner.get(u.owner_id)||byOwner.set(u.owner_id,[]).get(u.owner_id)).push(u);
 const db=new SupabaseDatabase(admin);let removed=0;
 for(const [owner,uploads] of byOwner){
  const row=await loadWorkspace(db,owner).catch(()=>undefined);if(row===undefined)continue;
  const text=row?JSON.stringify(row.state):'';
  for(const u of uploads){
   if(text.includes(u.id))continue;
   try{await bucket.delete(u.object_key);}catch{}
   const {error:del}=await admin.from('thrive_form_uploads').delete().eq('id',u.id).eq('owner_id',owner);
   if(!del)removed++;
  }
 }
 return {removed};
}

// Receipts only make a retried save safe; after 30 days they're dead weight. Old rate-limit counters too.
export async function pruneBookkeeping(env,{admin,now=Date.now()}={}){
 if(env.THRIVE_DATA_BACKEND!=='supabase')return {skipped:true};
 admin??=adminClient(env);
 const {error}=await admin.from('thrive_receipts').delete().lt('created_at',new Date(now-30*DAY).toISOString());
 await admin.rpc('thrive_rate_prune').then(()=>{},()=>{});
 // Before the migration adds created_at, the delete fails harmlessly.
 return {receipts:!error};
}
