import {loadWorkspace} from './store.mjs';
import {sendNylasNotification,sendOwnerNotification} from './nylas.mjs';
import {notificationSettings} from '../public/notification-settings.js';
import {validEmail} from '../public/communications-domain.js';
import {appOrigin} from './auth.mjs';
import {L} from '../public/i18n.js';
import {inWorkspaceLanguage} from './email-language.mjs';

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
 const none=L('Not provided');
 const lines=[L('A new response was received for {form}.',{form:clean(sub.formTitle)}), '', L('Name: {name}',{name:clean(sub.contactName||sub.clientName)||none}), L('Email: {email}',{email:clean(sub.contactEmail)||none}), '', L('View the response in Thrive: {url}',{url:`${origin}/#forms`}), '', L('Manage these emails in Account settings → Notifications.')];
 return {subject:L('New form response: {form}',{form:clean(sub.formTitle)}),body:lines.join('\n')};
}
export async function notifyFormResponse(db,owner,submissionId,env,{recipient=accountNotificationEmail,send=sendNylasNotification}={}){
 const {state}=await loadWorkspace(db,owner)||{};
 const sub=state?.submissions?.find(s=>s.id===submissionId);
 if(!sub||!notificationSettings(state).instant.formResponse)return {status:'disabled'};
 const email=await recipient(db,owner);
 if(!email)return {status:'unavailable'};
 return send(db,owner,env,sub.id,email,await inWorkspaceLanguage(env,state,()=>formNotificationMessage(sub,appOrigin(env))));
}

const clean=value=>String(value||'').replace(/[\r\n]+/g,' ').slice(0,180);
export function documentNotificationMessage(state,documentId,version,action,origin){
 const d=state.documents.find(d=>d.id===documentId),v=d?.versions?.find(v=>v.number===version),client=state.clients.find(c=>c.id===d?.clientId);
 const kind=d?.kind==='contract'||d?.kind==='agreement'?'contract':'proposal',verb=action==='decline'?'declined':action==='sign'?'signed':'accepted';
 const title=clean(v?.title||d?.title),who=clean(client?.name)||L('Your client'),person=clean(v?.response?.name)||who;
 // One sentence per action and kind, so each language can agree words properly.
 const subject={declined:L('{client} declined {title}',{client:who,title}),signed:L('{client} signed {title}',{client:who,title}),accepted:L('{client} accepted {title}',{client:who,title})}[verb];
 const line={
  'declined contract':L('{name} declined the contract “{title}”.',{name:person,title}),'declined proposal':L('{name} declined the proposal “{title}”.',{name:person,title}),
  'signed contract':L('{name} signed the contract “{title}”.',{name:person,title}),'signed proposal':L('{name} signed the proposal “{title}”.',{name:person,title}),
  'accepted contract':L('{name} accepted the contract “{title}”.',{name:person,title}),'accepted proposal':L('{name} accepted the proposal “{title}”.',{name:person,title}),
 }[`${verb} ${kind}`];
 return {subject,body:[line,'',L('Open it in Thrive: {url}',{url:`${origin}/#${kind==='contract'?'contracts':'proposals'}`}),'',L('Manage these emails in Account settings → Notifications.')].join('\n')};
}
// Client responses to shared proposals and contracts.
export async function notifyDocumentResponse(db,owner,documentId,version,action,env,{recipient=accountNotificationEmail,send=sendOwnerNotification}={}){
 const {state}=await loadWorkspace(db,owner)||{};
 if(!state?.documents?.some(d=>d.id===documentId))return {status:'disabled'};
 const prefs=notificationSettings(state).instant;
 if(!(action==='decline'?prefs.documentDeclined:prefs.documentAccepted))return {status:'disabled'};
 const email=await recipient(db,owner);
 if(!email)return {status:'unavailable'};
 return send(db,owner,env,`document-notification:${documentId}:${version}:${action}`,email,await inWorkspaceLanguage(env,state,()=>documentNotificationMessage(state,documentId,version,action,appOrigin(env))));
}
