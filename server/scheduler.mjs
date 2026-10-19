import {nylasStatus,nylasConnection,nylasRequest} from './nylas.mjs';
import {loadWorkspace,hashRequest,StoreError} from './store.mjs';
import {ownerOf,checkOrigin,readBody,json,errorResponse} from './http.mjs';

const clock=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
export const schedulerSlug=async(owner,typeId)=>'thrive-'+(await hashRequest({owner,typeId})).slice(0,32);
export function schedulerConfiguration(schedule,type,account,calendarId,slug){
 return {name:type.name,slug,requires_session_auth:false,
  participants:[{email:account.email,is_organizer:true,timezone:schedule.timeZone,availability:{calendar_ids:[calendarId]},booking:{calendar_id:calendarId}}],
  availability:{duration_minutes:type.duration,interval_minutes:15,availability_rules:{availability_method:'collective',buffer:{before:type.buffer,after:type.buffer},default_open_hours:[{days:schedule.days,start:clock(schedule.start),end:schedule.end===1440?'23:59':clock(schedule.end)}]}},
  event_booking:{title:type.name,description:type.description||'',location:type.location||'',timezone:schedule.timeZone,booking_type:'booking',disable_emails:false},
  scheduler:{available_days_in_future:30,min_booking_notice:schedule.notice*60,hide_additional_guests:true,hide_cancellation_options:false,hide_rescheduling_options:false}};
}
async function context(db,owner,env,fetcher){
 const connection=await nylasStatus(db,owner,env);
 const {state}=await loadWorkspace(db,owner)||{};
 if(!state)throw new StoreError('Workspace not found.',404);
 if(!connection.account?.calendar)return {connection,state,configs:[]};
 const account=await nylasConnection(db,owner),base='/grants/'+encodeURIComponent(account.grant_id);
 const call=(path,opts)=>nylasRequest(env,base+path,opts,fetcher);
 const configs=[];let cursor;
 for(let n=0;n<20;n++){const r=await call('/scheduling/configurations?'+new URLSearchParams({limit:'50',...(cursor?{page_token:cursor}:{})}));if(!Array.isArray(r.data))throw new StoreError('Booking pages could not be loaded.',502);configs.push(...r.data);cursor=r.next_cursor;if(!cursor)break;}
 if(cursor)throw new StoreError('Too many booking pages to load. Contact support.',502);
 return {connection,state,account,call,configs};
}
// Slugs are owner/type-derived; callers never supply a grant or configuration ID.
async function findConfig(ctx,owner,id){const slug=await schedulerSlug(owner,id);return {slug,config:ctx.configs.find(c=>c.slug===slug)};}
export async function schedulerStatus(db,owner,env,fetcher=fetch){
 const ctx=await context(db,owner,env,fetcher),pages={};
 for(const t of ctx.state.scheduling?.types||[]){const {slug,config}=await findConfig(ctx,owner,t.id);if(config)pages[t.id]={url:`https://book.nylas.com/${env.NYLAS_REGION||'eu'}/${encodeURIComponent(env.NYLAS_CLIENT_ID)}/${slug}`,published:!config.requires_session_auth};}
 return {connection:ctx.connection,pages};
}
export async function publishBookingPage(db,owner,env,id,{remove=false,existingOnly=false,fetcher=fetch}={}){
 const ctx=await context(db,owner,env,fetcher),t=ctx.state.scheduling?.types?.find(t=>t.id===id);
 if(!t)throw new StoreError('Event type not found.',404);
 if(!ctx.call){if(existingOnly)return {skipped:true};throw new StoreError('Connect a calendar with sending access in Settings → Connections.',409);}
 const {slug,config}=await findConfig(ctx,owner,id);
 if(remove){if(config)await ctx.call('/scheduling/configurations/'+encodeURIComponent(config.id),{method:'PUT',body:JSON.stringify({requires_session_auth:true})});return {unpublished:true};}
 if(!t.active)throw new StoreError('Enable this event type before publishing.',409);
 if(existingOnly&&(!config||config.requires_session_auth))return {skipped:true};
 const calendars=await ctx.call('/calendars?limit=200');
 const calendar=calendars.data?.find(c=>c.is_primary&&!c.read_only);
 if(!calendar?.id)throw new StoreError('No writable primary calendar was found. Check your calendar permissions.',409);
 const payload=schedulerConfiguration(ctx.state.scheduling,t,ctx.account,calendar.id,slug);
 const r=await ctx.call('/scheduling/configurations'+(config?'/'+encodeURIComponent(config.id):''),{method:config?'PUT':'POST',body:JSON.stringify(payload)});
 if(!r.data?.id||r.data.slug!==slug||r.data.requires_session_auth===true)throw new StoreError('Nylas did not confirm publication. Refresh booking pages before retrying.',502);
 return {published:true,url:`https://book.nylas.com/${env.NYLAS_REGION||'eu'}/${encodeURIComponent(env.NYLAS_CLIENT_ID)}/${slug}`};
}
export async function handleScheduler(request,db,env,fetcher=fetch){try{
 const owner=ownerOf(request);checkOrigin(request);
 if(request.method==='GET')return json(await schedulerStatus(db,owner,env,fetcher));
 if(request.method!=='POST')throw new StoreError('Method not allowed.',405);
 const body=await readBody(request,5000);
 if(!['publish','unpublish','sync'].includes(body.action)||typeof body.id!=='string')throw new StoreError('Choose an event type and action.');
 return json(await publishBookingPage(db,owner,env,body.id,{remove:body.action==='unpublish',existingOnly:body.action==='sync',fetcher}));
 }catch(e){return errorResponse(e);}}
