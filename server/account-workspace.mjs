import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {initScheduling} from '../public/scheduling-domain.js';
import {initWorkflows} from '../public/workflow-domain.js';
import {validateWorkspace} from './validation.mjs';
export function emptyWorkspace(user){
 const state=upgradeWorkspace(seed());
 for(const key of ['clients','projects','invoices','invoiceDrafts','time','workflows','activity','forms','documents','submissions','services','shareLinks','emailDrafts'])state[key]=[];
 state.settings={name:String(user.name||'Your name').slice(0,80),business:String(user.business||'My workspace').slice(0,80),deposit:50,phases:['Planning','Delivery','Review'],review:true,description:'',paymentInstructions:'',currency:'USD',country:'',businessName:String(user.business||'').slice(0,80),onboarding:{version:1,step:'profile'}};
 initBilling(state);initScheduling(state);initWorkflows(state);state.automation.workflows=[];state.automation.runs=[];
 return validateWorkspace(state);
}
