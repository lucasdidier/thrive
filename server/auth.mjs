import {createServerClient,parseCookieHeader,serializeCookieHeader} from '@supabase/ssr';
import {StoreError} from './store.mjs';
import {json,readBody,errorResponse} from './http.mjs';
import {supabaseURL} from './supabase-store.mjs';
export const accountsEnabled=env=>env.THRIVE_AUTH_MODE==='supabase';
export function accountConfig(env){const enabled=accountsEnabled(env);return {mode:enabled?'supabase':'preview',enabled,providers:{google:enabled&&env.THRIVE_GOOGLE_LOGIN==='true',microsoft:enabled&&env.THRIVE_MICROSOFT_LOGIN==='true'}};}
export function appOrigin(env){let url;try{url=new URL(env.THRIVE_APP_URL);}catch{throw new StoreError('The account service needs its application URL configured.',503);}if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||(url.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:')))throw new StoreError('The account service URL is invalid.',503);return url.origin;}
export function authContext(request,env,fetcher=fetch){
 if(!accountsEnabled(env))throw new StoreError('Account signup is not enabled yet.',503);
 const key=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY;if(!key)throw new StoreError('The account service is not configured.',503);
 const origin=appOrigin(env),cookies=new Map(parseCookieHeader(request.headers.get('cookie')||'').map(c=>[c.name,c.value])),changes=new Map();
 const client=createServerClient(supabaseURL(env),key,{global:{fetch:fetcher},cookieOptions:{name:'thrive-auth',httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/'},cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:values=>{for(const c of values){cookies.set(c.name,c.value);changes.set(c.name,c);}}}});
 return {client,origin,finish(response){const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.set('Vary','Cookie, Authorization');headers.set('Referrer-Policy','no-referrer');for(const {name,value,options} of changes.values())headers.append('Set-Cookie',serializeCookieHeader(name,value,{...options,httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/'}));return new Response(response.body,{status:response.status,headers});}};
}
export async function verifiedAccount(context,request){const bearer=request.headers.get('authorization');const token=bearer?.startsWith('Bearer ')?bearer.slice(7):undefined;const {data,error}=await context.client.auth.getUser(token);if(error||!data.user)return null;const user=data.user;return {id:user.id,owner:'supabase:'+user.id,email:user.email||'',name:typeof user.user_metadata?.name==='string'?user.user_metadata.name:typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:'',business:typeof user.user_metadata?.business==='string'?user.user_metadata.business:''};}
function authOrigin(request,origin){if(request.headers.get('origin')!==origin||new URL(request.url).origin!==origin)throw new StoreError('Open this page on the Thrive website to continue.',403);}
function emailValue(body){const email=String(body.email||'').trim();if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new StoreError('Enter a valid email address.');return email;}
function passwordValue(body){if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw new StoreError('Use a password with 12–128 characters.');return body.password;}
function checked(result,message){if(result.error)throw new StoreError(result.error.status===429?'Too many attempts. Please try again later.':message,result.error.status===429?429:400);return result.data;}
export async function handleAuth(request,env,{contextFactory=authContext}={}){let context;try{
 const config=accountConfig(env);
 if(request.method==='GET'&&!config.enabled)return json({...config,user:null});
 context=contextFactory(request,env);
 if(request.method==='GET')return context.finish(json({...config,user:await verifiedAccount(context,request)}));
 if(request.method!=='POST')throw new StoreError('Method not allowed.',405);
 authOrigin(request,context.origin);const body=await readBody(request,12000),auth=context.client.auth,callback=context.origin+'/auth/callback';let data;
 switch(body.action){
 case 'signup':{
 const email=emailValue(body),password=passwordValue(body),name=String(body.name||'').trim(),business=String(body.business||'').trim();if(!name||name.length>80||business.length>80)throw new StoreError('Enter your name (up to 80 characters). Business name is optional.');
 data=checked(await auth.signUp({email,password,options:{data:{name,business},emailRedirectTo:callback}}),'Unable to create an account. Try signing in or resetting your password.');
 return context.finish(json({ok:true,confirmation:!data.session,redirect:data.session?'/':undefined}));}
 case 'signin':data=checked(await auth.signInWithPassword({email:emailValue(body),password:String(body.password||'')}),'Unable to sign in. Check your email and password, and confirm your email first.');return context.finish(json({ok:true,redirect:'/'}));
 case 'forgot':{await auth.resetPasswordForEmail(emailValue(body),{redirectTo:callback+'?next=reset-password'});return context.finish(json({ok:true,message:'If an account exists for that email, a password reset link is on its way.'}));}
 case 'resend':{await auth.resend({type:'signup',email:emailValue(body),options:{emailRedirectTo:callback}});return context.finish(json({ok:true,message:'If your email needs confirmation, a new link is on its way.'}));}
 case 'reset':{if(!await verifiedAccount(context,request))throw new StoreError('Open a valid password reset link to continue.',401);checked(await auth.updateUser({password:passwordValue(body)}),'Unable to update your password. Request a new reset link and try again.');return context.finish(json({ok:true,redirect:'/'}));}
 case 'confirm':{if(!['signup','recovery','invite'].includes(body.type)||typeof body.token_hash!=='string'||!/^[a-zA-Z0-9_-]{20,256}$/.test(body.token_hash))throw new StoreError('This email link is invalid.');checked(await auth.verifyOtp({token_hash:body.token_hash,type:body.type}),'This email link has expired or has already been used. Request a new link.');return context.finish(json({ok:true,redirect:body.type==='signup'?'/':'/auth/reset-password'}));}
 case 'oauth':{if(!['google','microsoft'].includes(body.provider)||!config.providers[body.provider])throw new StoreError('This sign-in provider is not enabled yet.',503);data=checked(await auth.signInWithOAuth({provider:body.provider==='microsoft'?'azure':'google',options:{redirectTo:callback,scopes:body.provider==='microsoft'?'email':undefined,skipBrowserRedirect:true}}),'Unable to start sign-in. Please try again.');if(!data.url||new URL(data.url).origin!==new URL(supabaseURL(env)).origin)throw new StoreError('Unable to start sign-in.',503);return context.finish(json({redirect:data.url}));}
 case 'signout':{checked(await auth.signOut({scope:'local'}),'Unable to sign out. Please try again.');return context.finish(json({ok:true,redirect:'/auth/sign-in'}));}
 default:throw new StoreError('Unknown account action.');
 }
 }catch(error){const response=errorResponse(error);return context?context.finish(response):response;}}
export async function authCallback(request,env,{contextFactory=authContext}={}){let context;try{context=contextFactory(request,env);const url=new URL(request.url),code=url.searchParams.get('code');if(!code||code.length>2048||url.searchParams.has('error'))throw new StoreError('The sign-in link could not be verified.');checked(await context.client.auth.exchangeCodeForSession(code),'The sign-in link could not be verified.');const next=url.searchParams.get('next')==='reset-password'?'/auth/reset-password':'/';return context.finish(new Response(null,{status:303,headers:{Location:context.origin+next}}));}catch{const response=new Response(null,{status:303,headers:{Location:'/auth/sign-in?error=link','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});return context?context.finish(response):response;}}
