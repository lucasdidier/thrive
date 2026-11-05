import {env} from 'cloudflare:workers';
import {handleBetaRequest} from '../../../server/beta.mjs';
export const POST=(request:Request)=>handleBetaRequest(request,env);
