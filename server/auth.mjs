import {createServerClient,parseCookieHeader,serializeCookieHeader} from '@supabase/ssr';
import {StoreError} from './store.mjs';
import {json,readBody,errorResponse} from './http.mjs';
import {supabaseURL} from './supabase-store.mjs';
import {inviteOnly,hasBetaAccess,grantBetaAccess,isInvited} from './beta.mjs';
export const accountsEnabled=env=>env.THRIVE_AUTH_MODE==='supabase';
export const ownerEmail=env=>inviteOnly(env)?'':String(env.THRIVE_OWNER_EMAIL||'').trim().toLowerCase();
// Owner-only and invite-only deployments accept no passwords. Owner-only is Google only;
// invite-only also accepts a code emailed to an invited address.
const googleOnly=env=>!!ownerEmail(env)||inviteOnly(env);
const emailCodes=env=>accountsEnabled(env)&&inviteOnly(env);
const CODE_ACTIONS=['email-code','verify-code'];
export function accountConfig(env){const enabled=accountsEnabled(env);return {mode:enabled?'supabase':'preview',enabled,...(ownerEmail(env)?{ownerOnly:true}:{}),...(inviteOnly(env)?{inviteOnly:true}:{}),...(emailCodes(env)?{emailCode:true}:{}),providers:{google:enabled&&(inviteOnly(env)||env.THRIVE_GOOGLE_LOGIN==='true'),microsoft:enabled&&!googleOnly(env)&&env.THRIVE_MICROSOFT_LOGIN==='true'}};}
// Supabase can return to its configured Site URL when a callback URL is not
// allowlisted. Complete that same PKCE exchange before checking the session.
export async function accountHome(request,env,html,{contextFactory=authContext,landing}={}){
 const params=new URL(request.url).searchParams;
 if(params.has('code')||params.has('error'))return authCallback(request,env,{contextFactory});
 let context;try{context=contextFactory(request,env);if(!await verifiedAccount(context,request,env))return context.finish(landing?new Response(landing,{headers:{'Content-Type':'text/html; charset=utf-8'}}):new Response(null,{status:303,headers:{Location:'/auth/sign-in'}}));return context.finish(new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}}));}catch{return new Response('Account service unavailable. Please try again later.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
export function appOrigin(env){let url;try{url=new URL(env.THRIVE_APP_URL);}catch{throw new StoreError('The account service needs its application URL configured.',503);}if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||(url.protocol!=='https:'&&!(['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:')))throw new StoreError('The account service URL is invalid.',503);return url.origin;}
export function authContext(request,env,fetcher=fetch){
 if(!accountsEnabled(env))throw new StoreError('Account signup is not enabled yet.',503);
 const key=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY;if(!key)throw new StoreError('The account service is not configured.',503);
 const origin=appOrigin(env),cookies=new Map(parseCookieHeader(request.headers.get('cookie')||'').map(c=>[c.name,c.value])),changes=new Map();
 const client=createServerClient(supabaseURL(env),key,{global:{fetch:fetcher},cookieOptions:{name:'thrive-auth',httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/'},cookies:{getAll:()=>[...cookies].map(([name,value])=>({name,value})),setAll:values=>{for(const c of values){cookies.set(c.name,c.value);changes.set(c.name,c);}}}});
 return {client,origin,finish(response){const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store');headers.set('Vary','Cookie, Authorization');headers.set('Referrer-Policy','no-referrer');for(const {name,value,options} of changes.values())headers.append('Set-Cookie',serializeCookieHeader(name,value,{...options,httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:'/'}));return new Response(response.body,{status:response.status,headers});}};
}
export async function verifiedAccount(context,request,env={}){const bearer=request.headers.get('authorization');const token=bearer?.startsWith('Bearer ')?bearer.slice(7):undefined;const {data,error}=await context.client.auth.getUser(token);if(error||!data.user)return null;const user=data.user;if(inviteOnly(env)&&!hasBetaAccess(user))return null;if(ownerEmail(env)&&(String(user.email||'').toLowerCase()!==ownerEmail(env)||!user.email_confirmed_at||user.app_metadata?.provider!=='google'))return null;return {provider:user.app_metadata?.provider||'email',passwordAccount:!inviteOnly(env)&&(user.app_metadata?.providers||[user.app_metadata?.provider||'email']).includes('email'),id:user.id,owner:'supabase:'+user.id,email:user.email||'',name:typeof user.user_metadata?.name==='string'?user.user_metadata.name:typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:'',business:typeof user.user_metadata?.business==='string'?user.user_metadata.business:''};}
function authOrigin(request,origin){if(request.headers.get('origin')!==origin||new URL(request.url).origin!==origin)throw new StoreError('Open this page on the Thrive website to continue.',403);}
function emailValue(body){const email=String(body.email||'').trim();if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new StoreError('Enter a valid email address.');return email;}
function passwordValue(body){if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw new StoreError('Use a password with 12–128 characters.');return body.password;}
function checked(result,message){if(result.error)throw new StoreError(result.error.status===429?'Too many attempts. Please try again later.':message,result.error.status===429?429:400);return result.data;}
export async function handleAuth(request,env,{contextFactory=authContext,invited=isInvited,grant=grantBetaAccess}={}){let context;try{
 const config=accountConfig(env);
 if(request.method==='GET'&&!config.enabled)return json({...config,user:null});
 context=contextFactory(request,env);
 if(request.method==='GET')return context.finish(json({...config,user:await verifiedAccount(context,request,env)}));
 if(request.method!=='POST')throw new StoreError('Method not allowed.',405);
 authOrigin(request,context.origin);const body=await readBody(request,12000),auth=context.client.auth,callback=context.origin+'/auth/callback';let data;
 if(googleOnly(env)&&body.action!=='signout'&&!(body.action==='oauth'&&body.provider==='google')&&!(emailCodes(env)&&CODE_ACTIONS.includes(body.action)))throw new StoreError(inviteOnly(env)?'Thrive is in private beta. Sign in with Google or an email code.':'Thrive is private. Sign in with the authorized Google account.',403);
 switch(body.action){
 case 'signup':{
 const email=emailValue(body),password=passwordValue(body),name=String(body.name||'').trim(),business=String(body.business||'').trim();if(!name||name.length>80||business.length>80)throw new StoreError('Enter your name (up to 80 characters). Business name is optional.');
 data=checked(await auth.signUp({email,password,options:{data:{name,business},emailRedirectTo:callback}}),'Unable to create an account. Try signing in or resetting your password.');
 return context.finish(json({ok:true,confirmation:!data.session,redirect:data.session?'/':undefined}));}
 case 'signin':data=checked(await auth.signInWithPassword({email:emailValue(body),password:String(body.password||'')}),'Unable to sign in. Check your email and password, and confirm your email first.');return context.finish(json({ok:true,redirect:'/'}));
 case 'forgot':{await auth.resetPasswordForEmail(emailValue(body),{redirectTo:callback+'?next=reset-password'});return context.finish(json({ok:true,message:'If an account exists for that email, a password reset link is on its way.'}));}
 case 'resend':{await auth.resend({type:'signup',email:emailValue(body),options:{emailRedirectTo:callback}});return context.finish(json({ok:true,message:'If your email needs confirmation, a new link is on its way.'}));}
 case 'change-email':
 case 'change-password':{
 const account=await verifiedAccount(context,request,env);
 if(!account)throw new StoreError('Sign in again to update your account.',401);
 if(!account.passwordAccount)throw new StoreError('Manage your email and password with your sign-in provider.',403);
 const update=body.action==='change-email'?{email:emailValue(body)}:{password:passwordValue(body)};
 if(typeof body.currentPassword!=='string'||!body.currentPassword||body.currentPassword.length>128)throw new StoreError('Enter your current password.');
 const verified=checked(await auth.signInWithPassword({email:account.email,password:body.currentPassword}),'Your current password is incorrect.');
 if(verified.user?.id!==account.id)throw new StoreError('Sign in again to update your account.',401);
 checked(await auth.updateUser(update,{emailRedirectTo:callback}),'Unable to update your account. Sign in again and retry.');
 return context.finish(json({ok:true,message:body.action==='change-email'?'Check your email to confirm the new address.':'Password updated.'}));}
 case 'reset':{if(!await verifiedAccount(context,request,env))throw new StoreError('Open a valid password reset link to continue.',401);checked(await auth.updateUser({password:passwordValue(body)}),'Unable to update your password. Request a new reset link and try again.');return context.finish(json({ok:true,redirect:'/'}));}
 case 'confirm':{if(!['signup','recovery','invite'].includes(body.type)||typeof body.token_hash!=='string'||!/^[a-zA-Z0-9_-]{20,256}$/.test(body.token_hash))throw new StoreError('This email link is invalid.');checked(await auth.verifyOtp({token_hash:body.token_hash,type:body.type}),'This email link has expired or has already been used. Request a new link.');return context.finish(json({ok:true,redirect:body.type==='signup'?'/':'/auth/reset-password'}));}
 case 'oauth':{if(!['google','microsoft'].includes(body.provider)||!config.providers[body.provider])throw new StoreError('This sign-in provider is not enabled yet.',503);data=checked(await auth.signInWithOAuth({provider:body.provider==='microsoft'?'azure':'google',options:{redirectTo:callback,scopes:body.provider==='microsoft'?'email':undefined,skipBrowserRedirect:true}}),'Unable to start sign-in. Please try again.');if(!data.url||new URL(data.url).origin!==new URL(supabaseURL(env)).origin)throw new StoreError('Unable to start sign-in.',503);return context.finish(json({redirect:data.url}));}
 // Passwordless: email a one-time code (the email also carries a same-browser link).
 case 'email-code':{
 if(!emailCodes(env))throw new StoreError('Email codes are not available here.',403);
 const email=emailValue(body).toLowerCase();
 if(!await invited(email,env))throw new StoreError('This email isn’t on the beta list yet.',403);
 checked(await auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:callback}}),'We couldn’t send a code. Please try again in a minute.');
 return context.finish(json({ok:true,sent:true}));}
 case 'verify-code':{
 if(!emailCodes(env))throw new StoreError('Email codes are not available here.',403);
 const email=emailValue(body).toLowerCase(),token=String(body.code||'').replace(/\s+/g,'');
 if(!/^\d{6,10}$/.test(token))throw new StoreError('Enter the code from your email.');
 data=checked(await auth.verifyOtp({email,token,type:'email'}),'That code is incorrect or has expired. Ask for a new one.');
 if(!data?.user||!await grant(data.user,env)){await auth.signOut({scope:'local'});throw new StoreError('This email isn’t on the beta list yet.',403);}
 return context.finish(json({ok:true,redirect:'/'}));}
 case 'signout':{checked(await auth.signOut({scope:'local'}),'Unable to sign out. Please try again.');return context.finish(json({ok:true,redirect:'/auth/sign-in'}));}
 default:throw new StoreError('Unknown account action.');
 }
 }catch(error){const response=errorResponse(error);return context?context.finish(response):response;}}
export async function authCallback(request,env,{contextFactory=authContext,grant=grantBetaAccess}={}){let context;try{context=contextFactory(request,env);const url=new URL(request.url),code=url.searchParams.get('code');if(!code||code.length>2048||url.searchParams.has('error'))throw new StoreError('The sign-in link could not be verified.');checked(await context.client.auth.exchangeCodeForSession(code),'The sign-in link could not be verified.');if(inviteOnly(env)){const {data}=await context.client.auth.getUser();if(!data?.user||!await grant(data.user,env)){await context.client.auth.signOut({scope:'local'});return context.finish(new Response(null,{status:303,headers:{Location:context.origin+'/?access=pending'}}));}}if(ownerEmail(env)&&!await verifiedAccount(context,request,env)){await context.client.auth.signOut({scope:'local'});throw new StoreError('This Google account is not authorized.',403);}const next=url.searchParams.get('next')==='reset-password'?'/auth/reset-password':'/';return context.finish(new Response(null,{status:303,headers:{Location:context.origin+next}}));}catch{const response=new Response(null,{status:303,headers:{Location:'/auth/sign-in?error=link','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});return context?context.finish(response):response;}}
