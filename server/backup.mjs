// Nightly off-site backup to the BACKUPS R2 bucket, independent of Supabase's own backups.
//   db/YYYY-MM-DD.json.gz  every Thrive table plus account ids/emails (expire via an R2 lifecycle rule)
//   files/<object key>     form uploads, copied once (Supabase backups do not include Storage)
// Read-only on Supabase; reruns on the same day do nothing.
const tables={workspaces:'owner_id',receipts:'owner_id',events:'id',share_links:'token_hash',form_uploads:'id',google_connections:'owner_id',google_oauth_states:'hash',mail_threads:'owner_id',provider_operations:'owner_id',nylas_connections:'owner_id',nylas_oauth_states:'hash',beta_invites:'email',beta_requests:'email',subscriptions:'owner_id',free_access:'email',usage:'id'};
const PAGE=1000,BACKUP_HOUR_UTC=3;
async function rows(admin,table,order){
 const out=[];
 for(let from=0;;from+=PAGE){
  const {data,error}=await admin.from('thrive_'+table).select('*').order(order).range(from,from+PAGE-1);
  if(error){if(error.code==='42P01')return out;throw Error(`Backup of ${table} failed.`);}
  out.push(...data);if(data.length<PAGE)return out;
 }
}
async function users(admin){
 const out=[];
 for(let page=1;page<=50;page++){const {data,error}=await admin.auth.admin.listUsers({page,perPage:200});if(error)throw Error('Backup of accounts failed.');const list=data?.users||[];out.push(...list.map(u=>({id:u.id,email:u.email,created_at:u.created_at,provider:u.app_metadata?.provider,thrive_beta:u.app_metadata?.thrive_beta===true})));if(list.length<200)break;}
 return out;
}
const gzip=text=>new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
export async function runBackup(env,{admin,now=new Date(),force=false}={}){
 if(!env.BACKUPS)return {skipped:'no-bucket'};
 if(!force&&now.getUTCHours()!==BACKUP_HOUR_UTC)return {skipped:'not-due'};
 const date=now.toISOString().slice(0,10),key=`db/${date}.json.gz`;
 if(await env.BACKUPS.head(key))return {skipped:'done',key};
 const data={version:1,createdAt:now.toISOString(),supabase:env.SUPABASE_URL,accounts:await users(admin),tables:{}};
 for(const [table,order] of Object.entries(tables))data.tables[table]=await rows(admin,table,order);
 const files=await copyFiles(env,admin,data.tables.form_uploads);
 await env.BACKUPS.put(key,await gzip(JSON.stringify(data)),{httpMetadata:{contentType:'application/json',contentEncoding:'gzip'},customMetadata:{rows:String(Object.values(data.tables).reduce((n,t)=>n+t.length,0))}});
 return {key,files};
}
async function copyFiles(env,admin,uploads=[],max=200){
 const bucket=admin.storage.from('thrive-files');let copied=0;
 for(const u of uploads.filter(u=>u.status==='ready')){
  if(copied>=max)break;
  const key='files/'+u.object_key;if(await env.BACKUPS.head(key))continue;
  const {data,error}=await bucket.download(u.object_key);if(error||!data)continue;
  await env.BACKUPS.put(key,await data.arrayBuffer(),{customMetadata:{owner:u.owner_id,name:String(u.name).slice(0,200)}});copied++;
 }
 return copied;
}
