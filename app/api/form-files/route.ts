import {env} from 'cloudflare:workers';
import {handleFormUpload} from '../../../server/form-files.mjs';
export const POST=(request:Request)=>handleFormUpload(request,env.DB,env.BUCKET);
