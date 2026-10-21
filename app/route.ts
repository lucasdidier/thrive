import html from '../ui/index.html?raw';
import {env} from 'cloudflare:workers';
import {accountsEnabled,authContext,verifiedAccount} from '../server/auth.mjs';
export async function GET(request:Request){
 if(accountsEnabled(env)){let context;try{context=authContext(request,env);if(!await verifiedAccount(context,request))return context.finish(new Response(null,{status:303,headers:{Location:'/auth/sign-in'}}));return context.finish(new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}));}catch{return new Response('Account service unavailable. Please try again later.',{status:503,headers:{'Cache-Control':'no-store'}});}}
 if(!request.headers.get('oai-authenticated-user-id'))return Response.redirect(new URL('/signin-with-chatgpt?return_to=%2F',request.url),302);
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
