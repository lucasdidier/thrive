import {env} from 'cloudflare:workers';
import {withRuntime} from '../../../server/runtime.mjs';
import {adminEmail} from '../../../server/beta.mjs';
import {gatherDigest,digestHTML} from '../../../server/digest.mjs';
import {StoreError} from '../../../server/store.mjs';
// The daily digest as a page, for the admin only: app.runonthrive.com/api/digest shows yesterday's numbers.
export const GET=(request:Request)=>withRuntime(request,env,async({user})=>{
 if(!adminEmail(env)||String(user?.email||'').toLowerCase()!==adminEmail(env))throw new StoreError('Not found.',404);
 return new Response(digestHTML(await gatherDigest(env)),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
},{allowLocked:true});
