import {env} from 'cloudflare:workers';
import {googleCallback} from '../../../../server/auth.mjs';
export const GET=(request:Request)=>googleCallback(request,env);
