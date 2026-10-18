import {env} from 'cloudflare:workers';
import html from '../../../../ui/client.html?raw';
import {embeddedFormPage} from '../../../../server/form-embed.mjs';
import {withRuntime} from '../../../../server/runtime.mjs';
export async function GET(_request:Request,context:{params:Promise<{token:string}>}){const {token}=await context.params;return withRuntime(_request,env,async({db})=>embeddedFormPage(db,token,html),{publicAccess:true});}
