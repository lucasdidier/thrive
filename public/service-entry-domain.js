import {saveService,serviceItems,serviceRate} from './services-domain.js';
import {pricingBasis} from './pricing.js';

const key=value=>String(value??'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
export function matchingServices(state,query){
 const q=key(query),active=(state.services||[]).filter(s=>!s.archived);
 return {matches:active.filter(s=>key(s.name).includes(q)).sort((a,b)=>Number(key(b.name)===q)-Number(key(a.name)===q)).slice(0,8),canCreate:!!q&&String(query).trim().length<=100&&!active.some(s=>key(s.name)===q)};
}
export function invoiceServiceLines(state,id){
 const service=(state.services||[]).find(s=>s.id===id&&!s.archived);
 const lines=serviceItems(state,id);
 return service.kind==='package'?lines:lines.map(l=>({...l,description:service.name,...((l.details||l.description!==service.name)?{details:l.details||l.description}:{})}));
}
// Call against the same staged workspace used to save the document. A validation
// failure must never leave a catalog entry behind.
export function resolveNewServices(state,lines,{invoice=false}={}){
 const staged=structuredClone(state);
 const result=lines.map(line=>{
  const {createService,...item}=line;if(!createService)return item;
  const name=String(invoice?item.description:item.name).trim();
  let service=(staged.services||[]).find(s=>!s.archived&&key(s.name)===key(name));
  if(!service){
   if(!Number.isSafeInteger(item.rate)||item.rate<=0)throw Error(`Set a rate greater than zero for “${name}” to save it as a service.`);
   const details=invoice?item.details:item.description;
   service=saveService(staged,{name,kind:'service',...pricingBasis(item),items:[{description:name,...(details?{details}:{}),quantity:Number(item.quantity),rate:item.rate}]});
  }
  return {...item,serviceId:service.id,serviceVersion:service.version,...(!invoice?{items:serviceItems(staged,service.id)}:{})};
 });
 if(lines.some(l=>l.createService)){state.services=staged.services;state.activity=staged.activity;}
 return result;
}
export {serviceRate};
