import {env} from 'cloudflare:workers';
import {ownerOf} from '../../../../server/http.mjs';
import {finishGoogleOAuth} from '../../../../server/google.mjs';
export async function GET(request:Request){const target=new URL('/#messages',request.url);try{await finishGoogleOAuth(env.DB,ownerOf(request),env,new URL(request.url).searchParams);target.searchParams.set('google_connected','true');}catch(error){target.searchParams.set('google_error',error instanceof Error?error.message:'Google connection failed.');}return new Response(null,{status:303,headers:{Location:target.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
