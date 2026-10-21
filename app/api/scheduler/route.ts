import {env} from 'cloudflare:workers';
import {withRuntime} from '../../../server/runtime.mjs';
import {handleScheduler} from '../../../server/scheduler.mjs';
export const GET=(request:Request)=>withRuntime(request,env,async({request,db})=>handleScheduler(request,db,env));
export const POST=GET;
