import {portalClient} from './portal-domain.js';
// Links authorize one item or an explicitly configured client portal.
const collections={document:'documents',invoice:'invoices',form:'forms',portal:'clients'};
export const validShareToken=token=>typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);
export function shareTarget(state,entity,id){
 if(!collections[entity])throw Error('Choose a document, invoice, form, or client portal.');
 if(entity==='portal')return {record:portalClient(state,id),version:null};
 const record=state[collections[entity]]?.find(r=>r.id===id);
 if(!record||record.archived)throw Error('This item is unavailable.');
 if(entity==='document'){
  const version=record.versions.find(v=>v.number===record.currentVersion),project=state.projects.find(p=>p.id===record.projectId);
  if(!version||record.status==='draft'||version.status==='superseded')throw Error('Publish the document before sharing it.');
  if(project?.archived||project?.status==='cancelled')throw Error('Reopen the linked project before sharing.');
  return {record,version:version.number};
 }
 if(entity==='invoice'&&!record.number)throw Error('Issue the invoice before sharing it.');
 if(entity==='form'&&record.status!=='active')throw Error('Restore the form before sharing it.');
 return {record,version:null};
}
export function linkAvailable(state,link,now=Date.now()){
 if(!link||link.revokedAt||(link.expiresAt&&Date.parse(link.expiresAt)<=now))return false;
 try{return shareTarget(state,link.entity,link.recordId).version===link.version;}catch{return false;}
}
export function createShareLink(state,{entity,recordId,expiresInDays=30}){
 const {version}=shareTarget(state,entity,recordId);
 if(![0,7,30,90].includes(expiresInDays))throw Error('Choose 7, 30, or 90 days, or no expiry.');
 state.shareLinks??=[];
 const prior=state.shareLinks.find(l=>l.entity===entity&&l.recordId===recordId&&l.version===version&&linkAvailable(state,l));
 if(prior)return prior;
 if(state.shareLinks.length>=1000)throw Error('This workspace has reached its share-link limit.');
 const token=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const link={id:crypto.randomUUID(),token,entity,recordId,version,createdAt:new Date().toISOString(),expiresAt:expiresInDays?new Date(Date.now()+expiresInDays*86400000).toISOString():null,revokedAt:null};
 state.shareLinks.push(link);return link;
}
export function revokeShareLink(state,id){const link=state.shareLinks?.find(l=>l.id===id);if(!link)throw Error('Link not found.');link.revokedAt??=new Date().toISOString();return link;}
export const sharePath=link=>`/share/${link.token}`;
export function validateShareLinks(state,old){
 const links=state.shareLinks||[];if(!Array.isArray(links)||links.length>1000)throw Error('Invalid share links.');
 const ids=new Set(),tokens=new Set();
 for(const l of links){if(!l||typeof l.id!=='string'||ids.has(l.id)||tokens.has(l.token)||!validShareToken(l.token)||!collections[l.entity]||typeof l.recordId!=='string'||!(l.version===null||Number.isSafeInteger(l.version)&&l.version>0)||!Number.isFinite(Date.parse(l.createdAt))||(l.expiresAt!==null&&!Number.isFinite(Date.parse(l.expiresAt)))||(l.revokedAt!==null&&!Number.isFinite(Date.parse(l.revokedAt))))throw Error('Invalid share link.');ids.add(l.id);tokens.add(l.token);}
 for(const l of old?.shareLinks||[]){const n=links.find(x=>x.id===l.id);if(!n)throw Error('Revoke links instead of deleting them.');for(const key of ['token','entity','recordId','version','createdAt','expiresAt'])if(n[key]!==l[key])throw Error('Existing share links cannot be reassigned.');if(l.revokedAt!==null&&n.revokedAt!==l.revokedAt)throw Error('A revoked link cannot be reactivated.');}
}
