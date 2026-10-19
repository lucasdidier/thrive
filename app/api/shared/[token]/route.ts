import {env} from 'cloudflare:workers';
import {handleShared} from '../../../../server/sharing.mjs';
import {withRuntime} from '../../../../server/runtime.mjs';
export async function GET(request:Request,context:{params:Promise<{token:string}>}){const {token}=await context.params;return withRuntime(request,env,async({request,db})=>handleShared(request,db,token,env),{publicAccess:true});}
export async function POST(request:Request,context:{params:Promise<{token:string}>}){const {token}=await context.params;return withRuntime(request,env,async({request,db})=>handleShared(request,db,token,env),{publicAccess:true});}
