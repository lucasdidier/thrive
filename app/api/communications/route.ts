import {env} from 'cloudflare:workers';
import {handleCommunications} from '../../../server/communications.mjs';
export const GET=(request:Request)=>handleCommunications(request,env.DB,env);
export const POST=(request:Request)=>handleCommunications(request,env.DB,env);
