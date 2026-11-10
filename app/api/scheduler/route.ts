import {env} from 'cloudflare:workers';
import {withRuntime} from '../../../server/runtime.mjs';
import {handleScheduler} from '../../../server/scheduler.mjs';
import {needsPaidPlan} from '../../../server/subscription.mjs';
export const GET=(request:Request)=>withRuntime(request,env,async({request,db,user})=>handleScheduler(request,db,env,fetch,{needsPlan:()=>needsPaidPlan(env,user)}));
export const POST=GET;
