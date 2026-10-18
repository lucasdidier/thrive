import {env} from 'cloudflare:workers';
import {handleMcp} from '../../server/mcp.mjs';
import {withRuntime} from '../../server/runtime.mjs';
import {readBody,errorResponse} from '../../server/http.mjs';
export async function POST(request:Request){try{const rpc=await readBody(request.clone());if(['initialize','ping','tools/list','notifications/initialized'].includes(rpc.method))return handleMcp(request,null,env);return withRuntime(request,env,async({request,db})=>handleMcp(request,db,env));}catch(error){return errorResponse(error);}}
