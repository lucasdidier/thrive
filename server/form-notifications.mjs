import {loadWorkspace} from './store.mjs';
import {sendNylasNotification} from './nylas.mjs';
import {validEmail} from '../public/communications-domain.js';
import {appOrigin} from './auth.mjs';

// Recipient comes exclusively from the authenticated account directory.
export async function accountNotificationEmail(db,owner){
 if(!owner.startsWith('supabase:')||!db.client?.auth?.admin)return null;
 const {data,error}=await db.client.auth.admin.getUserById(owner.slice(9));
 if(error)throw Error('Account email lookup failed.');
 const user=data?.user;
 return user?.email_confirmed_at&&validEmail(user.email)?user.email:null;
}
export function formNotificationMessage(sub,origin){
 const clean=value=>String(value||'').replace(/[\r\n]+/g,' ').slice(0,180);
 const lines=[`A new response was received for ${clean(sub.formTitle)}.`, '', `Name: ${clean(sub.contactName||sub.clientName)||'Not provided'}`, `Email: ${clean(sub.contactEmail)||'Not provided'}`, '', `View the response in Thrive: ${origin}/#forms`, '', 'You can turn these emails off in Workspace settings → Notifications.'];
 return {subject:`New form response: ${clean(sub.formTitle)}`,body:lines.join('\n')};
}
export async function notifyFormResponse(db,owner,submissionId,env,{recipient=accountNotificationEmail,send=sendNylasNotification}={}){
 const {state}=await loadWorkspace(db,owner)||{};
 const sub=state?.submissions?.find(s=>s.id===submissionId);
 if(!sub||state.settings.formEmailNotifications===false)return {status:'disabled'};
 const email=await recipient(db,owner);
 if(!email)return {status:'unavailable'};
 return send(db,owner,env,sub.id,email,formNotificationMessage(sub,appOrigin(env)));
}
