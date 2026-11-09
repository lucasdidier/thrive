import {env} from 'cloudflare:workers';
import {oauthConsent} from '../../../server/mcp-oauth.mjs';
export const GET=(request:Request)=>oauthConsent(request,env);
export const POST=(request:Request)=>oauthConsent(request,env);
