// Paddle Billing API and webhook signatures. Only the Worker holds the API key and webhook secret;
// the browser gets the client-side token (PADDLE_CLIENT_TOKEN), which can only open checkouts.
import {StoreError} from './store.mjs';

// The key decides the environment (pdl_sdbx_… sandbox, pdl_live_… live). Older keys without a prefix
// follow the client-side token (test_… is sandbox).
export function paddleSandbox(env){
 const key=String(env.PADDLE_API_KEY||'');
 if(key.startsWith('pdl_sdbx_'))return true;
 if(key.startsWith('pdl_live_'))return false;
 return String(env.PADDLE_CLIENT_TOKEN||'').startsWith('test_');
}
const base=env=>paddleSandbox(env)?'https://sandbox-api.paddle.com':'https://api.paddle.com';

// refused: the message for a request Paddle turns down (4xx), e.g. a plan change it won't make.
export async function paddleRequest(env,path,{method='GET',body,fetcher=fetch,refused=''}={}){
 if(!env.PADDLE_API_KEY)throw new StoreError('Billing is not set up yet. Please contact support.',503);
 let response;
 try{response=await fetcher(base(env)+path,{method,headers:{Authorization:'Bearer '+env.PADDLE_API_KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});}
 catch{throw new StoreError('The billing service is unavailable. Please try again.',502);}
 const data=await response.json().catch(()=>({}));
 if(response.status===404)throw new StoreError('Payment not found.',404);
 if(refused&&response.status>=400&&response.status<500){console.warn('paddle.refused',response.status,data?.error?.code||'');throw new StoreError(refused,409);}
 if(!response.ok||!data?.data){console.warn('paddle.error',response.status,data?.error?.code||'');throw new StoreError('The billing service is unavailable. Please try again.',502);}
 return data.data;
}

const hex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
function sameText(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
// Paddle-Signature: ts=<unix seconds>;h1=<hex HMAC-SHA256 of "ts:rawBody">. Several h1 values may appear
// while a secret rotates. Old timestamps are refused; replays inside the window are harmless because
// events apply in order (thrive_apply_subscription).
export async function verifyPaddleSignature(raw,header,secret,{now=Date.now(),tolerance=300}={}){
 if(!secret||!header)return false;
 const parts=String(header).split(';').map(p=>p.split('=')),ts=parts.find(([k])=>k==='ts')?.[1],signatures=parts.filter(([k])=>k==='h1').map(([,v])=>String(v||'').toLowerCase());
 if(!/^\d{1,12}$/.test(ts||'')||!signatures.length||Math.abs(now/1000-Number(ts))>tolerance)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const expected=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${ts}:${raw}`)));
 return signatures.some(s=>sameText(s,expected));
}

// The parts of a Paddle subscription Thrive keeps (see thrive_apply_subscription).
export function subscriptionSnapshot(sub,{owner,eventAt}){
 const change=sub?.scheduled_change;
 return {owner_id:owner,subscription_id:sub.id,customer_id:sub.customer_id||null,status:String(sub.status||''),period_ends_at:sub.current_billing_period?.ends_at||null,cancel_at:change&&['cancel','pause'].includes(change.action)?change.effective_at||null:null,price_id:sub.items?.[0]?.price?.id||null,event_at:eventAt||sub.updated_at||new Date().toISOString()};
}

// A price for display, cached per isolate for an hour (five minutes after a failure). Null when Paddle
// can't be reached.
const priceCache=new Map();
export async function paddlePrice(env,{id=env.PADDLE_PRICE_ID,fetcher=fetch,now=Date.now()}={}){
 id=String(id||'');if(!id||!env.PADDLE_API_KEY)return null;
 const hit=priceCache.get(id);if(hit&&hit.until>now)return hit.value;
 let value=null,until=now+300000;
 try{const p=await paddleRequest(env,'/prices/'+encodeURIComponent(id),{fetcher});value={amount:String(p.unit_price?.amount??''),currency:String(p.unit_price?.currency_code||''),interval:p.billing_cycle?.interval||'month',frequency:p.billing_cycle?.frequency||1};until=now+3600000;}
 catch{}
 priceCache.set(id,{value,until});if(priceCache.size>20)priceCache.delete(priceCache.keys().next().value);
 return value;
}
// Thrive Cloud's plans: monthly (PADDLE_PRICE_ID) and, when it is set, yearly (PADDLE_YEARLY_PRICE_ID).
export async function paddlePlans(env,{fetcher=fetch,now=Date.now()}={}){
 const ids={month:String(env.PADDLE_PRICE_ID||''),year:String(env.PADDLE_YEARLY_PRICE_ID||'')};
 const [month,year]=await Promise.all(['month','year'].map(k=>ids[k]?paddlePrice(env,{id:ids[k],fetcher,now}):null));
 return {month:ids.month?{priceId:ids.month,price:month}:null,year:ids.year?{priceId:ids.year,price:year}:null};
}
