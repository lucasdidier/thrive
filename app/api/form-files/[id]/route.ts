import {env} from 'cloudflare:workers';
import {downloadFormFile} from '../../../../server/form-files.mjs';
import {withRuntime} from '../../../../server/runtime.mjs';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){const {id}=await context.params;return withRuntime(request,env,async({request,db,bucket})=>downloadFormFile(request,db,bucket,id));}
