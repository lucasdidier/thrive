import {authContext,accountsEnabled,verifiedAccount} from './auth.mjs';
import {SupabaseDatabase,adminClient,supabaseBucket} from './supabase-store.mjs';
import {setRequestIdentity,ownerOf,errorResponse} from './http.mjs';
import {StoreError} from './store.mjs';
export function dataBackend(env){if(env.THRIVE_DATA_BACKEND==='supabase'){const client=adminClient(env);return {db:new SupabaseDatabase(client),bucket:supabaseBucket(client)};}if(env.THRIVE_DATA_BACKEND&&env.THRIVE_DATA_BACKEND!=='sites')throw new StoreError('Unknown database configuration.',503);return {db:env.DB,bucket:env.BUCKET};}
/** @param {Request} request @param {any} env @param {(context: {request: Request, db: any, bucket: any, user: any}) => Promise<Response>} handler */
export async function withRuntime(request,env,handler,{publicAccess=false,contextFactory=authContext}={}){let context;try{
 const backend=dataBackend(env);if(publicAccess)return await handler({request,...backend,user:null});
 let user;
 if(accountsEnabled(env)){
 context=contextFactory(request,env);user=await verifiedAccount(context,request);if(!user)throw new StoreError('Sign in to access this workspace.',401);
 const expected=request.headers.get('x-thrive-account');if(expected&&expected!==user.owner)throw new StoreError('Your account changed in another tab. Reload to continue.',409);
 if(!['GET','HEAD'].includes(request.method)&&!request.headers.get('authorization')?.startsWith('Bearer ')){
 if(expected!==user.owner||request.headers.get('origin')!==context.origin)throw new StoreError('Reload your workspace before making changes.',403);
 }
 const headers=new Headers(request.headers);headers.delete('oai-authenticated-user-id');headers.delete('oai-authenticated-user-email');request=new Request(request.url,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,duplex:'half'});setRequestIdentity(request,user);
 }else{const owner=ownerOf(request);user={owner,email:request.headers.get('oai-authenticated-user-email')};if(env.THRIVE_MIGRATION_KEY&&!['GET','HEAD'].includes(request.method))throw new StoreError('Account migration is in progress. Please try again shortly.',503);}
 const response=await handler({request,...backend,user});return context?context.finish(response):response;
 }catch(error){const response=errorResponse(error);return context?context.finish(response):response;}}
