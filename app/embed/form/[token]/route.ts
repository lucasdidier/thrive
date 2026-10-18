import {env} from 'cloudflare:workers';
import html from '../../../../ui/client.html?raw';
import {embeddedFormPage} from '../../../../server/form-embed.mjs';
export async function GET(_request:Request,context:{params:Promise<{token:string}>}){return embeddedFormPage(env.DB,(await context.params).token,html);}
