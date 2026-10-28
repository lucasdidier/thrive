import {hashRequest,StoreError} from './store.mjs';

const email=value=>String(value||'').trim().toLowerCase();
function calendarLink(value){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&['calendar.google.com','www.google.com','outlook.live.com','outlook.office.com','outlook.office365.com'].includes(url.hostname)?url.href:null;}catch{return null;}
}

// Scheduler stamps key5 with the configuration ID. Match only configurations
// derived from this workspace's owner/type slugs, never titles or guest input.
// https://developer.nylas.com/docs/v3/scheduler/customize-scheduler/#metadata-scheduler-adds-to-events
export async function schedulerMeetings(ctx,owner,ownedConfigs,now=Date.now()){
 const meetings=new Map();
 for(const {config,type} of ownedConfigs){
  const organizer=config.participants?.find(p=>p.is_organizer&&email(p.email)===email(ctx.account.email));
  const calendarId=organizer?.booking?.calendar_id;
  if(!calendarId)throw new StoreError('The booking calendar could not be identified. Refresh or reconnect your calendar.',502);
  let cursor;const seen=new Set();
  for(let page=0;page<20;page++){
   const params=new URLSearchParams({calendar_id:calendarId,metadata_pair:'key5:'+config.id,limit:'200',show_cancelled:'true',...(cursor?{page_token:cursor}:{})});
   const response=await ctx.call('/events?'+params);
   if(!Array.isArray(response.data))throw new StoreError('Booked meetings could not be loaded. Please refresh.',502);
   for(const event of response.data){
    if(event.metadata?.key5!==config.id||!event.id)continue;
    const start=event.when?.start_time,end=event.when?.end_time;
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||!Number.isFinite(new Date(start*1000).getTime())||!Number.isFinite(new Date(end*1000).getTime()))continue;
    const guests=(event.participants||[]).filter(p=>p.email&&email(p.email)!==email(ctx.account.email));
    const guest=guests[0]||{};
    const client=ctx.state.clients?.find(c=>email(c.email)&&email(c.email)===email(guest.email));
    const id='scheduler-'+(await hashRequest({owner,calendarId,eventId:event.id}));
    meetings.set(id,{
     id,source:'scheduler',typeId:type.id,typeName:event.title||type.name,
     start:new Date(start*1000).toISOString(),end:new Date(end*1000).toISOString(),
     duration:Math.round((end-start)/60),timeZone:ctx.state.scheduling.timeZone||'UTC',
     status:event.status==='cancelled'?'cancelled':end*1000<=now?'completed':'scheduled',
     location:event.location||'',clientId:client?.id||null,
     contactName:guest.name||guest.email||'Guest',contactEmail:guest.email||'',
     guests:guests.map(p=>({name:p.name||p.email,email:p.email})),calendarUrl:calendarLink(event.html_link),
    });
   }
   cursor=response.next_cursor;
   if(!cursor)break;
   if(typeof cursor!=='string'||seen.has(cursor))throw new StoreError('Booked meetings could not be fully loaded. Please refresh.',502);
   seen.add(cursor);
  }
  if(cursor)throw new StoreError('There are too many bookings to load at once. Contact support.',502);
 }
 return [...meetings.values()].sort((a,b)=>a.start.localeCompare(b.start));
}
