// Client links are authorized by their token. Same-origin cookies also let an
// authorized preview visitor pass the hosting gate; they do not select a workspace.
export async function requestShared(endpoint,method='GET',body,fetcher=globalThis.fetch){
 const response=await fetcher(endpoint,{
  method,
  headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined,
  credentials:'same-origin',
  cache:'no-store',
  referrerPolicy:'no-referrer',
  signal:AbortSignal.timeout(20000)
 });
 let data;
 try{data=await response.json();}catch{
  const error=Error([401,403].includes(response.status)
   ?'This private Thrive preview requires site access. Sign in with an account that has access, then reload this page.'
   :'The shared page could not be loaded. Please try again.');
  error.status=response.status===200?502:response.status;
  throw error;
 }
 if(!response.ok){const error=Error(data.error||'Unable to complete the request.');error.status=response.status;throw error;}
 return data;
}
