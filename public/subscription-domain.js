// Thrive Cloud plan: a 7-day trial without a card, then a Paddle subscription. Pure: access rules,
// labels and the trial emails, shared by the Worker (server/subscription.mjs) and the browser.
import {emailLayout} from './email-layout.js';
import {L,language} from './i18n.js';

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

// When the account locked (ms), or null while it is open: the trial's end, a lapsed renewal's grace
// period, or the moment a subscription ended.
export function lockedSince(row,{now=new Date(),comped=false}={}){
 if(!planAccess(row,{now,comped}).locked)return null;
 const live=LIVE_STATUSES.includes(row?.status),end=time(row?.period_ends_at);
 const times=[time(row?.trial_ends_at),live&&end!=null?end+RENEWAL_GRACE:null,...(!live&&row?.status?[end,time(row.cancel_at),time(row.event_at)]:[])].filter(t=>t!=null&&t<=now.getTime());
 return times.length?Math.max(...times):now.getTime();
}

// "$83.33" from Paddle's smallest-unit amount ("8333") and currency.
export function formatAmount(amount,currency){
 if(!currency||!/^-?\d+$/.test(String(amount??'')))return '';
 try{const f=new Intl.NumberFormat('en-US',{style:'currency',currency});return f.format(Number(amount)/10**f.resolvedOptions().maximumFractionDigits);}catch{return '';}
}

export const trialLabel=access=>access.lastDay?'Last day of your trial':`${access.daysLeft} day${access.daysLeft===1?'':'s'} left in your trial`;

// "$10 / month", "$96 / year", "$30 every 3 months". amount is in the currency's smallest unit (Paddle).
export function priceLabel(price,{style='slash'}={}){
 if(!price?.currency||!/^\d+$/.test(String(price.amount??'')))return '';
 let format;try{format=new Intl.NumberFormat(language(),{style:'currency',currency:price.currency});}catch{return '';}
 const digits=format.resolvedOptions().maximumFractionDigits,value=Number(price.amount)/10**digits;
 const amount=new Intl.NumberFormat(language(),{style:'currency',currency:price.currency,minimumFractionDigits:Number.isInteger(value)?0:digits}).format(value);
 const interval=['day','week','month','year'].includes(price.interval)?price.interval:'month',every=Math.max(1,Number(price.frequency)||1);
 // Translated for month and year (the plans Thrive sells); English wording otherwise.
 if(every>1)return interval==='year'?L('{amount} every {n} years',{amount,n:every}):interval==='month'?L('{amount} every {n} months',{amount,n:every}):`${amount} every ${every} ${interval}s`;
 if(interval==='month')return style==='words'?L('{amount} a month',{amount}):L('{amount} / month',{amount});
 if(interval==='year')return style==='words'?L('{amount} a year',{amount}):L('{amount} / year',{amount});
 return style==='words'?`${amount} a ${interval}`:`${amount} / ${interval}`;
}

// The yearly plan's saving against twelve monthly payments, in whole percent: 17 for $100 a year against
// $10 a month. 0 when the two prices can't be compared.
export function yearlySaving(month,year){
 if(!month||!year||month.currency!==year.currency||month.interval!=='month'||year.interval!=='year'||Number(month.frequency||1)!==1||Number(year.frequency||1)!==1)return 0;
 const m=Number(month.amount),y=Number(year.amount);
 return m>0&&y>0?Math.max(0,Math.round((1-y/(12*m))*100)):0;
}
// "$10 a month or $100 a year": every plan that has a price.
export const planCost=(prices,style='words')=>{const [a,b]=[prices?.month,prices?.year].map(p=>priceLabel(p,{style}));return a&&b?L('{first} or {second}',{first:a,second:b}):a||b||'';};

export function formatDay(iso,timeZone='UTC'){
 const t=time(iso);if(t==null)return '';
 try{return new Intl.DateTimeFormat(language(),{weekday:'long',month:'long',day:'numeric',timeZone}).format(t);}
 catch{return new Intl.DateTimeFormat(language(),{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(t);}
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
export function trialEmail(stage,{origin,trialEndsAt,timeZone,price,prices=price?{month:price}:null}){
 const day=formatDay(trialEndsAt,timeZone),cost=planCost(prices),plan=`${origin}/#account/plan`;
 const copy={
  welcome:{subject:L('Your Thrive trial has started'),title:L('Your free trial has started'),meta:L('It runs until {date}.',{date:day}),body:[L('Your trial includes clients, proposals, contracts, invoices, time, forms, workflows and AI. No card needed. Email and calendar sync, and booking pages, come with the paid plan.'),cost?L('When the trial ends, subscribe for {price} to keep going. Your workspace stays as you left it.',{price:cost}):L('When the trial ends, subscribe to keep going. Your workspace stays as you left it.')],action:{label:L('Open Thrive'),href:origin}},
  '3d':{subject:L('3 days left in your Thrive trial'),title:L('3 days left in your trial'),meta:L('Your trial ends on {date}.',{date:day}),body:[cost?L('Subscribe for {price} to keep your workspace, client links and workflows running without a break. Cancel anytime.',{price:cost}):L('Subscribe to keep your workspace, client links and workflows running without a break. Cancel anytime.')],action:{label:L('Subscribe'),href:plan}},
  '1d':{subject:L('Your Thrive trial ends tomorrow'),title:L('Your trial ends tomorrow'),meta:L('It ends on {date}.',{date:day}),body:[L('After that, your workspace is locked until you subscribe. Nothing is deleted.'),...(cost?[L('Thrive is {price}. Cancel anytime.',{price:cost})]:[])],action:{label:L('Subscribe'),href:plan}},
  ended:{subject:L('Your Thrive trial has ended'),title:L('Your trial has ended'),meta:L('Your workspace is saved.'),body:[L('Subscribe to pick up where you left off. Your clients, projects, documents and invoices are all still there, and links you shared with clients keep working.')],action:{label:L('Subscribe'),href:plan}},
 }[stage];
 if(!copy)throw Error('Unknown trial email.');
 const text=[copy.title,copy.meta,'',...copy.body.flatMap(p=>[p,'']),`${copy.action.label}: ${copy.action.href}`].join('\n');
 return {subject:copy.subject,body:text,html:emailLayout({origin,title:copy.title,meta:copy.meta,preheader:copy.body[0],body:copy.body,action:copy.action,manage:{label:L('Plan & billing'),path:'#account/plan'}})};
}
