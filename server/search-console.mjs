// Google Search Console numbers for the daily digest (free API). Needs a Google Cloud service account
// that is a user on the Search Console property: its JSON key goes in the GSC_SERVICE_ACCOUNT secret, and
// GSC_SITE names the property ("sc-domain:runonthrive.com"). Without them the digest skips SEO.
const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const text=s=>b64url(new TextEncoder().encode(s));

export function searchConsoleConfig(env){
 if(!env.GSC_SERVICE_ACCOUNT||!env.GSC_SITE)return null;
 try{const key=JSON.parse(env.GSC_SERVICE_ACCOUNT);return key.client_email&&key.private_key?{email:key.client_email,key:key.private_key,site:String(env.GSC_SITE)}:null;}catch{return null;}
}

async function accessToken({email,key},{fetcher=fetch,now=new Date()}={}){
 const pem=key.replace(/-----[^-]+-----/g,'').replace(/\s+/g,'');
 const der=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));
 const signer=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const iat=Math.floor(now.getTime()/1000);
 const unsigned=`${text(JSON.stringify({alg:'RS256',typ:'JWT'}))}.${text(JSON.stringify({iss:email,scope:'https://www.googleapis.com/auth/webmasters.readonly',aud:'https://oauth2.googleapis.com/token',iat,exp:iat+3600}))}`;
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',signer,new TextEncoder().encode(unsigned));
 const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${unsigned}.${b64url(signature)}`}),signal:AbortSignal.timeout(8000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||!data.access_token)throw Error('Search Console sign-in failed.');
 return data.access_token;
}

const day=d=>d.toISOString().slice(0,10);
// Last 7 days with data (Search Console lags 2–3 days) against the 7 before, plus top queries and pages.
export async function searchStats(env,{fetcher=fetch,now=new Date()}={}){
 const config=searchConsoleConfig(env);if(!config)return null;
 const token=await accessToken(config,{fetcher,now});
 const query=async body=>{const r=await fetcher(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.site)}/searchAnalytics/query`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Search Console query failed.');return (await r.json()).rows||[];};
 const end=new Date(now.getTime()-3*864e5),start=new Date(end.getTime()-6*864e5),prevEnd=new Date(start.getTime()-864e5),prevStart=new Date(prevEnd.getTime()-6*864e5);
 const totals=rows=>{const t=rows[0]||{};return {clicks:t.clicks||0,impressions:t.impressions||0,ctr:t.ctr||0,position:t.position||0};};
 const [current,previous,queries,pages]=await Promise.all([
  query({startDate:day(start),endDate:day(end)}),
  query({startDate:day(prevStart),endDate:day(prevEnd)}),
  query({startDate:day(start),endDate:day(end),dimensions:['query'],rowLimit:5}),
  query({startDate:day(start),endDate:day(end),dimensions:['page'],rowLimit:5}),
 ]);
 return {from:day(start),to:day(end),current:totals(current),previous:totals(previous),
  queries:queries.map(r=>({query:r.keys[0],clicks:r.clicks,impressions:r.impressions,position:r.position})),
  pages:pages.map(r=>({page:r.keys[0].replace(/^https?:\/\/[^/]+/,'')||'/',clicks:r.clicks,impressions:r.impressions}))};
}
