import {loadWorkspace} from './store.mjs';
import {sendNylasNotification,sendOwnerNotification} from './nylas.mjs';
import {notificationSettings} from '../public/notification-settings.js';
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
 const lines=[`A new response was received for ${clean(sub.formTitle)}.`, '', `Name: ${clean(sub.contactName||sub.clientName)||'Not provided'}`, `Email: ${clean(sub.contactEmail)||'Not provided'}`, '', `View the response in Thrive: ${origin}/#forms`, '', 'Manage these emails in Account settings → Notifications.'];
 return {subject:`New form response: ${clean(sub.formTitle)}`,body:lines.join('\n')};
}
export async function notifyFormResponse(db,owner,submissionId,env,{recipient=accountNotificationEmail,send=sendNylasNotification}={}){
 const {state}=await loadWorkspace(db,owner)||{};
 const sub=state?.submissions?.find(s=>s.id===submissionId);
 if(!sub||!notificationSettings(state).instant.formResponse)return {status:'disabled'};
 const email=await recipient(db,owner);
 if(!email)return {status:'unavailable'};
 return send(db,owner,env,sub.id,email,formNotificationMessage(sub,appOrigin(env)));
}

const clean=value=>String(value||'').replace(/[\r\n]+/g,' ').slice(0,180);
export function documentNotificationMessage(state,documentId,version,action,origin){
 const d=state.documents.find(d=>d.id===documentId),v=d?.versions?.find(v=>v.number===version),client=state.clients.find(c=>c.id===d?.clientId);
 const kind=d?.kind==='contract'||d?.kind==='agreement'?'contract':'proposal',verb=action==='decline'?'declined':action==='sign'?'signed':'accepted';
 const title=clean(v?.title||d?.title);
 return {subject:`${clean(client?.name)||'Your client'} ${verb} ${title}`,body:[`${clean(v?.response?.name)||clean(client?.name)||'Your client'} ${verb} the ${kind} “${title}”.`,'',`Open it in Thrive: ${origin}/#${kind==='contract'?'contracts':'proposals'}`,'','Manage these emails in Account settings → Notifications.'].join('\n')};
}
// Client responses to shared proposals and contracts.
export async function notifyDocumentResponse(db,owner,documentId,version,action,env,{recipient=accountNotificationEmail,send=sendOwnerNotification}={}){
 const {state}=await loadWorkspace(db,owner)||{};
 if(!state?.documents?.some(d=>d.id===documentId))return {status:'disabled'};
 const prefs=notificationSettings(state).instant;
 if(!(action==='decline'?prefs.documentDeclined:prefs.documentAccepted))return {status:'disabled'};
 const email=await recipient(db,owner);
 if(!email)return {status:'unavailable'};
 return send(db,owner,env,`document-notification:${documentId}:${version}:${action}`,email,documentNotificationMessage(state,documentId,version,action,appOrigin(env)));
}
