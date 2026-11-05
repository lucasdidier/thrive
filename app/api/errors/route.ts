import {env} from 'cloudflare:workers';
import {handleClientError} from '../../../server/guard.mjs';
export const POST=(request:Request)=>handleClientError(request,env);
