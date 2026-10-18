import {env} from 'cloudflare:workers';
import {resolveShare} from '../../../../../server/sharing.mjs';
import {handleFormUpload} from '../../../../../server/form-files.mjs';
import {errorResponse} from '../../../../../server/http.mjs';
export async function POST(request:Request,context:{params:Promise<{token:string}>}){try{return handleFormUpload(request,env.DB,env.BUCKET,await resolveShare(env.DB,(await context.params).token));}catch(error){return errorResponse(error);}}
