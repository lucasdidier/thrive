// Thrive Cloud plan: a 7-day trial without a card, then a Paddle subscription. Pure: access rules,
// labels and the trial emails, shared by the Worker (server/subscription.mjs) and the browser.
import {emailLayout} from './email-layout.js';

export const TRIAL_DAYS=7;
const DAY=86400000;
// Paddle keeps these subscriptions billing (past_due while it retries a failed payment).
export const LIVE_STATUSES=['active','trialing','past_due'];
// A live subscription whose period ended this long ago without a renewal no longer grants access.
const RENEWAL_GRACE=7*DAY;
const time=v=>{const t=v?Date.parse(v):NaN;return Number.isFinite(t)?t:null;};

// What an account can do right now. States: comped, trial, active, canceling, past_due (all open);
// expired (trial over, never subscribed) and ended (subscription over) are locked.
export function planAccess(row,{now=new Date(),comped=false}={}){
 const t=now.getTime();
 if(comped||row?.comped)return {state:'comped',locked:false};
 const periodEnd=time(row?.period_ends_at),cancelAt=time(row?.cancel_at),trialEnd=time(row?.trial_ends_at);
 if(LIVE_STATUSES.includes(row?.status)&&!(periodEnd&&t>periodEnd+RENEWAL_GRACE)){
  if(row.status==='past_due')return {state:'past_due',locked:false,renewsAt:row.period_ends_at||null};
  return cancelAt?{state:'canceling',locked:false,endsAt:row.cancel_at}:{state:'active',locked:false,renewsAt:row.period_ends_at||null};
 }
 if(trialEnd!=null&&t<trialEnd)return {state:'trial',locked:false,trialEndsAt:row.trial_ends_at,daysLeft:Math.max(1,Math.ceil((trialEnd-t)/DAY)),lastDay:trialEnd-t<=DAY};
 return {state:row?.status?'ended':'expired',locked:true,trialEndsAt:row?.trial_ends_at||null};
}

export const trialLabel=access=>access.lastDay?'Last day of your trial':`${access.daysLeft} day${access.daysLeft===1?'':'s'} left in your trial`;

// "$10 / month", "$96 / year", "$30 every 3 months". amount is in the currency's smallest unit (Paddle).
export function priceLabel(price,{style='slash'}={}){
 if(!price?.currency||!/^\d+$/.test(String(price.amount??'')))return '';
 let format;try{format=new Intl.NumberFormat('en-US',{style:'currency',currency:price.currency});}catch{return '';}
 const digits=format.resolvedOptions().maximumFractionDigits,value=Number(price.amount)/10**digits;
 const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:price.currency,minimumFractionDigits:Number.isInteger(value)?0:digits}).format(value);
 const interval=['day','week','month','year'].includes(price.interval)?price.interval:'month',every=Math.max(1,Number(price.frequency)||1);
 if(every>1)return `${amount} every ${every} ${interval}s`;
 return style==='words'?`${amount} a ${interval}`:`${amount} / ${interval}`;
}

export function formatDay(iso,timeZone='UTC'){
 const t=time(iso);if(t==null)return '';
 try{return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone}).format(t);}
 catch{return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(t);}
}

// Trial emails in order. Each goes once; a late start sends only the latest one due, never a backlog.
export const TRIAL_EMAILS=['welcome','3d','1d','ended'];
const ENDED_WINDOW=3*DAY;
export function trialEmailDue(row,{now=new Date()}={}){
 const end=time(row?.trial_ends_at);if(end==null||row.comped||row.status)return null;
 const left=end-now.getTime();
 const due=left<=0?(left>-ENDED_WINDOW?'ended':null):left<=DAY?'1d':left<=3*DAY?'3d':'welcome';
 if(!due)return null;
 return TRIAL_EMAILS.indexOf(due)>TRIAL_EMAILS.indexOf(row.trial_email||'')?due:null;
}

// {subject, body (plain text), html} for one trial email.
export function trialEmail(stage,{origin,trialEndsAt,timeZone,price}){
 const day=formatDay(trialEndsAt,timeZone),cost=priceLabel(price,{style:'words'}),plan=`${origin}/#account/plan`;
 const copy={
  welcome:{subject:'Your Thrive trial has started',title:'Your free trial has started',meta:`It runs until ${day}.`,body:['Everything in Thrive is included: clients, proposals, contracts, invoices, time, scheduling and AI. No card needed.',`When the trial ends, subscribe${cost?` for ${cost}`:''} to keep going. Your workspace stays as you left it.`],action:{label:'Open Thrive',href:origin}},
  '3d':{subject:'3 days left in your Thrive trial',title:'3 days left in your trial',meta:`Your trial ends on ${day}.`,body:[`Subscribe${cost?` for ${cost}`:''} to keep your workspace, client links and workflows running without a break. Cancel anytime.`],action:{label:'Subscribe',href:plan}},
  '1d':{subject:'Your Thrive trial ends tomorrow',title:'Your trial ends tomorrow',meta:`It ends on ${day}.`,body:['After that, your workspace is locked until you subscribe. Nothing is deleted.',...(cost?[`Thrive is ${cost}. Cancel anytime.`]:[])],action:{label:'Subscribe',href:plan}},
  ended:{subject:'Your Thrive trial has ended',title:'Your trial has ended',meta:'Your workspace is saved.',body:['Subscribe to pick up where you left off. Your clients, projects, documents and invoices are all still there, and links you shared with clients keep working.'],action:{label:'Subscribe',href:plan}},
 }[stage];
 if(!copy)throw Error('Unknown trial email.');
 const text=[copy.title,copy.meta,'',...copy.body.flatMap(p=>[p,'']),`${copy.action.label}: ${copy.action.href}`].join('\n');
 return {subject:copy.subject,body:text,html:emailLayout({origin,title:copy.title,meta:copy.meta,preheader:copy.body[0],body:copy.body,action:copy.action,manage:{label:'Plan & billing',path:'#account/plan'}})};
}
