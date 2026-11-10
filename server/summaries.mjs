import {dataBackend} from './runtime.mjs';
import {loadWorkspace} from './store.mjs';
import {workspaceOwner} from './workspace-directory.mjs';
import {summaryDue,buildSummary} from '../public/summary-domain.js';
import {sendOwnerNotification} from './nylas.mjs';
import {appOrigin} from './auth.mjs';
import {inviteOnly,openAccess,betaUsers,confirmedUsers} from './beta.mjs';
import {lockedOwners} from './subscription.mjs';

// Hourly cron: each workspace gets its summary at 8:00 in its own time zone.
// Read-only on workspaces; delivery ids make reruns within the hour harmless.
export async function runSummaries(env,{now=new Date(),send=sendOwnerNotification,backend=dataBackend,locked=lockedOwners}={}){
 if(env.THRIVE_DATA_BACKEND!=='supabase'||(!env.THRIVE_OWNER_EMAIL&&!inviteOnly(env)&&!openAccess(env)))return {sent:0};
 const {db}=backend(env);
 let users;
 if(inviteOnly(env))users=await betaUsers(db.client);
 else if(openAccess(env))users=await confirmedUsers(db.client);
 else{
  const {data,error}=await db.client.auth.admin.listUsers({perPage:200});
  if(error)throw Error('Account lookup failed.');
  users=(data?.users||[]).filter(u=>u.email?.toLowerCase()===env.THRIVE_OWNER_EMAIL.toLowerCase()&&u.email_confirmed_at).slice(0,1);
 }
 // Accounts whose trial or subscription has ended get no summary: its links open a locked workspace.
 const skip=await locked(env,{admin:db.client,now});
 let sent=0;
 for(const user of users){
  if(skip.has('supabase:'+user.id))continue;
  const owner='supabase:'+user.id,dir=await loadWorkspace(db,`${owner}:workspace-directory`);
  for(const id of dir?.state?.workspaceIds||['default']){
   const workspace=workspaceOwner(owner,id),row=await loadWorkspace(db,workspace);if(!row)continue;
   const due=summaryDue(row.state,now);if(!due)continue;
   const message=buildSummary(row.state,{now,frequency:due.frequency,origin:appOrigin(env)});if(!message)continue;
   try{const r=await send(db,workspace,env,`summary:${due.frequency}:${due.date}`,user.email,message);if(r.status==='sent')sent++;}catch{console.warn('Summary email could not be delivered.');}
  }
 }
 return {sent};
}
