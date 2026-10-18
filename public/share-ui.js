import {createShareLink,revokeShareLink,sharePath,shareTarget,linkAvailable} from './share-domain.js';
export function createShareUI({getState:S,save,blocked,open,dialog,btn,esc,toast}){
 let target=null;
 const current=()=>S().shareLinks?.find(l=>l.entity===target.entity&&l.recordId===target.id&&linkAvailable(S(),l));
 function show(entity,id){target={entity,id};const {record}=shareTarget(S(),entity,id),link=current(),title=record.title||record.number||record.name;
  open('Share with client',`<div class="dialog-body"><h2>${esc(title)}</h2><p>Anyone with this link can view this ${entity} and ${entity==='form'?'submit a response':entity==='invoice'?'download it':'respond if requested'}. They cannot access your workspace.</p>${link?`<label class="field">Client link<input id="client-share-url" readonly value="${esc(new URL(sharePath(link),location.origin).href)}"></label><p class="hint">${link.expiresAt?'Expires '+new Date(link.expiresAt).toLocaleDateString():'No expiry'}${link.version?' · Version '+link.version:''}</p><div class="action-row"><button class="btn primary" data-action="share-copy">Copy link</button><a class="btn" href="${sharePath(link)}" target="_blank" rel="noopener noreferrer">Open client view ↗</a></div><section class="section"><h3>Stop sharing</h3><p class="hint">Revoking this link stops access immediately. You can generate a new one.</p>${btn('Revoke link','share-revoke',`data-id="${link.id}"`)}</section>`:`<label class="field">Link expires<select id="share-expiry"><option value="7">After 7 days</option><option value="30" selected>After 30 days</option><option value="90">After 90 days</option><option value="0">Never</option></select></label><p class="hint">${entity==='document'?'The link is tied to this published version. Revising or archiving the document stops access.':entity==='form'?'The link uses the current form. Archiving the form stops new responses.':'Payment instructions and the recorded balance stay up to date.'}</p>${btn('Generate client link','share-generate','','primary')}`}<div class="form-error" role="alert"></div></div>`,{footer:btn('Done','close')});
 }
 async function run(action,el){
  if(action==='share-item'){show(el.dataset.entity,el.dataset.id);return;}
  if(action==='share-copy'){try{await navigator.clipboard.writeText(new URL(sharePath(current()),location.origin).href);toast('Client link copied.');}catch{const input=dialog.querySelector('#client-share-url');input.focus();input.select();toast('Select and copy the link.');}return;}
  if(action==='share-generate')createShareLink(S(),{entity:target.entity,recordId:target.id,expiresInDays:Number(dialog.querySelector('#share-expiry').value)});
  if(action==='share-revoke')revokeShareLink(S(),el.dataset.id);
  await save();if(blocked())return;show(target.entity,target.id);toast(action==='share-revoke'?'Link revoked.':'Client link ready.');
 }
 function handleClick(action,el){if(!['share-item','share-copy','share-generate','share-revoke'].includes(action))return false;void run(action,el).catch(e=>{const box=dialog.querySelector('.form-error');if(box)box.textContent=e.message;else toast(e.message);});return true;}
 return {handleClick};
}
