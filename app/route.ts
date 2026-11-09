import html from '../ui/index.html?raw';
import landing from '../ui/landing.html?raw';
import {env} from 'cloudflare:workers';
import {accountsEnabled,accountHome} from '../server/auth.mjs';
import {passwordless} from '../server/beta.mjs';
export async function GET(request:Request){
 if(accountsEnabled(env))return accountHome(request,env,html,{landing:passwordless(env)?landing.replaceAll('hello@thrive.example',String(env.THRIVE_SUPPORT_EMAIL||'hello@thrive.example')):undefined});
 if(!request.headers.get('oai-authenticated-user-id'))return Response.redirect(new URL('/signin-with-chatgpt?return_to=%2F',request.url),302);
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
