import {uid,addActivity} from './domain.js';
import {calculateInvoice} from './invoice-domain.js';
const copy=x=>structuredClone(x),clean=x=>String(x??'').trim();
export function saveService(s,data,id){
 const old=id?(s.services||[]).find(x=>x.id===id):null;if(id&&!old)throw Error('Service not found.');
 const name=clean(data.name),kind=data.kind||'service';if(!name||name.length>100)throw Error('Enter a name of up to 100 characters.');
 if(!['service','package'].includes(kind))throw Error('Choose a service or package.');
 if(kind==='service'&&data.items?.length!==1)throw Error('A service has one item. Choose Package for multiple items.');
 const {items,amount}=calculateInvoice(data.items);const record={id:old?.id||uid(),name,kind,items,amount,version:(old?.version||0)+1,archived:old?.archived||false};
 s.services??=[];if(old)Object.assign(old,record);else s.services.unshift(record);addActivity(s,'Service saved',name,'document');return old||record;
}
export function toggleService(s,id){const x=(s.services||[]).find(x=>x.id===id);if(!x)throw Error('Service not found.');x.archived=!x.archived;return x;}
export function serviceItems(s,id){const x=(s.services||[]).find(x=>x.id===id&&!x.archived);if(!x)throw Error('Choose an active service.');return copy(x.items).map(i=>({...i,serviceId:x.id,serviceVersion:x.version,...(x.kind==='package'?{packageName:x.name}:{})}));}
export function serviceOffer(s,id){const x=(s.services||[]).find(x=>x.id===id&&!x.archived);if(!x)throw Error('Choose an active service.');return {id:uid(),name:x.name,description:x.items.map(i=>`${i.description} × ${i.quantity}`).join('\n'),rate:x.amount,mode:'required',group:'',min:1,max:1,quantity:1,serviceId:x.id,serviceVersion:x.version,items:serviceItems(s,id)};}
export function validateOffers(input=[]){
 if(!Array.isArray(input)||input.length>20)throw Error('Use up to 20 service options.');
 const seen=new Set();return input.map(x=>{const id=clean(x.id),name=clean(x.name),description=clean(x.description),rate=Number(x.rate),min=Number(x.min),max=Number(x.max),quantity=Number(x.quantity),mode=x.mode,group=clean(x.group);
 if(!id||seen.has(id))throw Error('Service options must have unique identifiers.');seen.add(id);
 if(!name||name.length>100||description.length>2000)throw Error('Add a service name and keep descriptions under 2,000 characters.');
 if(!Number.isSafeInteger(rate)||rate<1||rate>100000000)throw Error('Set a positive service price.');
 if(!['required','optional','choice'].includes(mode))throw Error('Choose Required, Optional, or Choose one.');
 if(mode==='choice'&&(!group||group.length>60))throw Error('Give each choose-one option a group name.');
 if(![min,max,quantity].every(Number.isSafeInteger)||min<1||max<min||max>10000||quantity<min||quantity>max)throw Error('Use whole quantities within the minimum and maximum.');
 return {id,name,description,rate,min,max,quantity,mode,group:mode==='choice'?group:'',...(x.serviceId?{serviceId:clean(x.serviceId),serviceVersion:x.serviceVersion,items:copy(x.items||[])}:{})};});
}
export function defaultSelections(offers=[]){const groups=new Set();return offers.filter(o=>o.mode==='required'||(o.mode==='choice'&&!groups.has(o.group)&&groups.add(o.group))).map(o=>({id:o.id,quantity:o.quantity}));}
export function quoteOffers(input,selections=defaultSelections(input)){
 const offers=validateOffers(input);if(!Array.isArray(selections))throw Error('Choose your services.');const seen=new Set(),groups=new Map();
 const items=selections.map(x=>{if(seen.has(x.id))throw Error('A service can only be selected once.');seen.add(x.id);const o=offers.find(o=>o.id===x.id);if(!o)throw Error('This service option is no longer available.');const quantity=Number(x.quantity);if(!Number.isSafeInteger(quantity)||quantity<o.min||quantity>o.max)throw Error(`${o.name}: choose a quantity from ${o.min} to ${o.max}.`);if(o.mode==='choice')groups.set(o.group,(groups.get(o.group)||0)+1);return {...copy(o),quantity,amount:o.rate*quantity};});
 if(offers.some(o=>o.mode==='required'&&!seen.has(o.id)))throw Error('Include all required services.');
 if(offers.some(o=>o.mode==='choice'&&groups.get(o.group)!==1))throw Error('Select exactly one option from each group.');
 const amount=items.reduce((sum,x)=>sum+x.amount,0);if(!Number.isSafeInteger(amount)||amount<1||amount>10000000000)throw Error('Select at least one service with a valid total.');return {items,amount,selections:items.map(({id,quantity})=>({id,quantity}))};
}
