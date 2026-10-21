import {env} from 'cloudflare:workers';
import {handleCommunications} from '../../../server/communications.mjs';
import {withRuntime} from '../../../server/runtime.mjs';
export const GET=(request:Request)=>withRuntime(request,env,async({request,db,bucket})=>handleCommunications(request,db,env));
export const POST=(request:Request)=>withRuntime(request,env,async({request,db,bucket})=>handleCommunications(request,db,env));
