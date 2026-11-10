import {env} from 'cloudflare:workers';
import {withRuntime} from '../../../server/runtime.mjs';
import {checkOrigin} from '../../../server/http.mjs';
import {handleBilling} from '../../../server/subscription.mjs';
// Stays open after the trial ends (allowLocked) so a locked account can subscribe or export its data.
export const GET=(request:Request)=>withRuntime(request,env,async(context)=>handleBilling(context.request,env,context),{allowLocked:true});
export const POST=(request:Request)=>withRuntime(request,env,async(context)=>{checkOrigin(context.request);return handleBilling(context.request,env,context);},{allowLocked:true});
