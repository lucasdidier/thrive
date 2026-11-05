import {runSummaries} from './summaries.mjs';
import {sendBetaInvites} from './beta.mjs';
import {runBackup} from './backup.mjs';
import {adminClient} from './supabase-store.mjs';
import {appOrigin} from './auth.mjs';
import {reportError} from './guard.mjs';
// Each job runs independently; a failure alerts the admin and never blocks the others.
export async function runScheduled(env,{jobs}={}){
 const admin=()=>adminClient(env);
 jobs??={
  summaries:()=>runSummaries(env),
  invites:()=>sendBetaInvites(env,{admin:admin(),origin:appOrigin(env)}),
  backup:()=>runBackup(env,{admin:admin()}),
 };
 const results={};
 for(const [name,job] of Object.entries(jobs)){
  try{results[name]=await job();}
  catch(error){results[name]={error:error?.message};await reportError(env,{source:'cron:'+name,message:error?.message||'Job failed',stack:error?.stack}).catch(()=>{});}
 }
 return results;
}
