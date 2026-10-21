import {env} from 'cloudflare:workers';
import {ownerOf} from '../../../../server/http.mjs';
import {finishNylasOAuth} from '../../../../server/nylas.mjs';
import {withRuntime} from '../../../../server/runtime.mjs';
export async function GET(request:Request){return withRuntime(request,env,async({request,db})=>{const target=new URL('/#messages',request.url);try{const result=await finishNylasOAuth(db,ownerOf(request),env,new URL(request.url).searchParams);target.hash=result.returnTo;target.searchParams.set('nylas_connected','true');}catch(error){target.searchParams.set('nylas_error',error instanceof Error?error.message:'Nylas connection failed.');}return new Response(null,{status:303,headers:{Location:target.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});});}
