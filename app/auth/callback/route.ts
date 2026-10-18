import {env} from 'cloudflare:workers';
import {authCallback} from '../../../server/auth.mjs';
export const GET=(request:Request)=>authCallback(request,env);
