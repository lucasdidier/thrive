import {currencies,currencyCode} from './currency.js';
import {L} from './i18n.js';
export async function workspaceRequest(method='GET',body){const r=await fetch('/api/workspaces',{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||L('Unable to load workspaces.'));return d;}
export function createWorkspaceManager({account,getState,open,esc,btn,toast,isPending,canLeave,onCreated}){
 function switchTo(id){if(isPending())throw Error(L('Wait for your changes to finish syncing.'));if(!canLeave())return;const url=new URL(location.href);url.search='';if(id!=='default')url.searchParams.set('workspace',id);url.hash='overview';location.assign(url.href);}
 function click(action,el){if(action==='workspace-switch'){switchTo(el.dataset.id);return true;}if(action!=='workspace-new')return false;
 if(isPending())throw Error(L('Wait for your changes to finish syncing.'));if(!canLeave())return true;
 open(L('Create a workspace'),`<form id="create-workspace-form" data-request-id="${crypto.randomUUID()}"><div class="dialog-body"><label class="field">${L('Workspace name')}<input name="name" required maxlength="80" autocomplete="organization" placeholder="${esc(L('e.g. My design studio'))}"></label><label class="field">${L('Default currency')}<select name="currency">${Object.entries(currencies).map(([code,label])=>`<option value="${code}" ${code===currencyCode(getState())?'selected':''}>${code} · ${esc(label)}</option>`).join('')}</select></label><div class="form-error" role="alert"></div></div><div class="dialog-footer">${btn(L('Cancel'),'close')}<button type="submit" class="btn primary">${L('Create workspace')}</button></div></form>`,{drawer:false});return true;
 }
 function submit(form){if(form.id!=='create-workspace-form')return false;const button=form.querySelector('[type=submit]');button.disabled=true;void(async()=>{try{const v=new FormData(form),result=await workspaceRequest('POST',{id:form.dataset.requestId,name:v.get('name'),currency:v.get('currency')});onCreated();location.assign('/?workspace='+encodeURIComponent(result.id)+'#overview');}catch(e){form.querySelector('.form-error').textContent=e.message;button.disabled=false;}})();return true;}
 return {click,submit};
}
