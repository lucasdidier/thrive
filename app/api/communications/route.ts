import {env} from 'cloudflare:workers';
import {handleCommunications} from '../../../server/communications.mjs';
import {withRuntime} from '../../../server/runtime.mjs';
import {needsPaidPlan} from '../../../server/subscription.mjs';
const handle=(request:Request)=>withRuntime(request,env,async({request,db,user})=>handleCommunications(request,db,env,fetch,{needsPlan:()=>needsPaidPlan(env,user)}));
export const GET=handle;
export const POST=handle;
