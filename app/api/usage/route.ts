import {env} from 'cloudflare:workers';
import {withRuntime} from '../../../server/runtime.mjs';
import {recordUsage} from '../../../server/analytics.mjs';
// Product analytics batches from public/analytics.js. Open on a locked plan too, to see what people do there.
export const POST=(request:Request)=>withRuntime(request,env,async(context)=>recordUsage(context.request,env,context.user),{allowLocked:true});
