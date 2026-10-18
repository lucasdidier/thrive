import {env} from 'cloudflare:workers';
import {handleShared} from '../../../../server/sharing.mjs';
export async function GET(request:Request,context:{params:Promise<{token:string}>}){return handleShared(request,env.DB,(await context.params).token);}
export async function POST(request:Request,context:{params:Promise<{token:string}>}){return handleShared(request,env.DB,(await context.params).token);}
