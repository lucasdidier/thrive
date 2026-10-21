import {clientNylasEmails,listNylasEvents} from './nylas.mjs';
import {ownerOf,checkOrigin,readBody,json,errorResponse} from './http.mjs';
import {loadWorkspace,hashRequest,StoreError} from './store.mjs';
import {googleStatus,startGoogleOAuth,disconnectGoogle,listConversations,syncGmail,updateConversation,sendEmail,checkEmailDelivery,calendarBusy,createCalendarEvent,checkNylasEvent,cancelNylasEvent} from './communication-provider.mjs';
export async function handleCommunications(request,db,env,fetcher=fetch){try{const owner=ownerOf(request);checkOrigin(request);if(request.method==='GET'){return json({connection:await googleStatus(db,owner,env),...await listConversations(db,owner)});}const body=await readBody(request,50000);switch(body.action){
 case'connect':return json(await startGoogleOAuth(db,owner,env,body.mode,fetcher,body.returnTo,body.provider));
 case'disconnect':return json(await disconnectGoogle(db,owner,env,fetcher));
 case'client-emails':return json(await clientNylasEmails(db,owner,env,body.clientId,{cursor:body.cursor,messageId:body.messageId},fetcher));
 case'sync':return json(await syncGmail(db,owner,env,fetcher));
 case'conversation':return json(await updateConversation(db,owner,body));
 case'preview':{const {state}=await loadWorkspace(db,owner)||{},record=body.kind==='email'?state?.emailDrafts?.find(d=>d.id===body.id):body.kind==='calendar'?state?.scheduling?.meetings?.find(m=>m.id===body.id):null;if(!record)throw new StoreError('Record not found.',404);return json({record,hash:await hashRequest(record)});}
 case'send':return json(await sendEmail(db,owner,env,body.id,body.hash,fetcher));
 case'check-delivery':return json(await checkEmailDelivery(db,owner,env,body.id,fetcher));
 case'calendar-events':return json(await listNylasEvents(db,owner,env,body.start,body.end,body.cursor,fetcher));
 case'busy':return json(await calendarBusy(db,owner,env,body.start,body.end,fetcher));
 case'calendar-check':return json(await checkNylasEvent(db,owner,env,body.id,fetcher));
 case'calendar-cancel':return json(await cancelNylasEvent(db,owner,env,body.id,fetcher));
 case'calendar-event':return json(await createCalendarEvent(db,owner,env,body.id,body.hash,fetcher));
 default:throw new StoreError('Unsupported communication action.');
 }}catch(error){return errorResponse(error);}}
