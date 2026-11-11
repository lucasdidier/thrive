import {runSummaries} from './summaries.mjs';
import {sendBetaInvites} from './beta.mjs';
import {runBackup} from './backup.mjs';
import {sendTrialEmails,disconnectLockedAccounts} from './subscription.mjs';
import {adminClient} from './supabase-store.mjs';
import {appOrigin} from './auth.mjs';
import {reportError} from './guard.mjs';
import {pruneUsage} from './analytics.mjs';
import {pruneVisits} from './visits.mjs';
import {sendDigest} from './digest.mjs';
import {pruneOrphanUploads,pruneBookkeeping} from './maintenance.mjs';
// Each job runs independently; a failure alerts the admin and never blocks the others.
export async function runScheduled(env,{jobs}={}){
 const admin=()=>adminClient(env);
 jobs??={
  invites:()=>sendBetaInvites(env,{admin:admin(),origin:appOrigin(env)}),
  backup:()=>runBackup(env,{admin:admin()}),
  trials:()=>sendTrialEmails(env),
  connections:()=>disconnectLockedAccounts(env),
  usage:()=>pruneUsage(env,{admin:admin()}),
  visits:()=>pruneVisits(env,{admin:admin()}),
  digest:()=>sendDigest(env,{admin:admin()}),
  uploads:()=>new Date().getUTCHours()===3?pruneOrphanUploads(env,{admin:admin()}):{skipped:true},
  bookkeeping:()=>new Date().getUTCHours()===3?pruneBookkeeping(env,{admin:admin()}):{skipped:true},
  // Last: it reads every account's workspace, so it must not starve the jobs above.
  summaries:()=>runSummaries(env),
 };
 const results={};
 for(const [name,job] of Object.entries(jobs)){
  try{results[name]=await job();}
  catch(error){results[name]={error:error?.message};await reportError(env,{source:'cron:'+name,message:error?.message||'Job failed',stack:error?.stack}).catch(()=>{});}
 }
 return results;
}
