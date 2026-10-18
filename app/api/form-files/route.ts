import {env} from 'cloudflare:workers';
import {handleFormUpload} from '../../../server/form-files.mjs';
import {withRuntime} from '../../../server/runtime.mjs';
export const POST=(request:Request)=>withRuntime(request,env,async({request,db,bucket})=>handleFormUpload(request,db,bucket));
