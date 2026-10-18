import {env} from 'cloudflare:workers';
import {downloadFormFile} from '../../../../server/form-files.mjs';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return downloadFormFile(request,env.DB,env.BUCKET,(await context.params).id);}
