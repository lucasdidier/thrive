import {env} from 'cloudflare:workers';
import {resolveSharedResource} from '../../../../../server/sharing.mjs';
import {handleFormUpload} from '../../../../../server/form-files.mjs';
import {errorResponse} from '../../../../../server/http.mjs';
import {withRuntime} from '../../../../../server/runtime.mjs';
export async function POST(request:Request,context:{params:Promise<{token:string}>}){const {token}=await context.params;return withRuntime(request,env,async({request,db,bucket})=>handleFormUpload(request,db,bucket,await resolveSharedResource(db,token,new URL(request.url).searchParams.get('item'))),{publicAccess:true});}
