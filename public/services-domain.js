import {pricingBasis,quantityLabel,validQuantity,hasTimePricing} from './pricing.js';
import {uid,addActivity} from './domain.js';
import {calculateInvoice} from './invoice-domain.js';
const copy=x=>structuredClone(x),clean=x=>String(x??'').trim();
export function saveService(s,data,id){
 const old=id?(s.services||[]).find(x=>x.id===id):null;if(id&&!old)throw Error('Service not found.');
 const name=clean(data.name),kind=data.kind||'service';if(!name||name.length>100)throw Error('Enter a name of up to 100 characters.');
 if(!['service','package'].includes(kind))throw Error('Choose a service or package.');
 if(kind==='service'&&data.items?.length!==1)throw Error('A service has one item. Choose Package for multiple items.');
 const basis=pricingBasis({...old,...data}),{items,amount}=calculateInvoice(data.items);const record={id:old?.id||uid(),name,kind,...basis,items,amount,...(old?.starterKey?{starterKey:old.starterKey}:{}),version:(old?.version||0)+1,archived:old?.archived||false};
 s.services??=[];if(old)Object.assign(old,record);else s.services.unshift(record);addActivity(s,'Service saved',name,'document');return old||record;
}
export function toggleService(s,id){const x=(s.services||[]).find(x=>x.id===id);if(!x)throw Error('Service not found.');x.archived=!x.archived;return x;}
export const serviceRate=x=>x.kind==='service'?x.items[0].rate:x.amount;
export function serviceItems(s,id){const x=(s.services||[]).find(x=>x.id===id&&!x.archived);if(!x)throw Error('Choose an active service.');return copy(x.items).map(i=>({...i,...pricingBasis(x),serviceId:x.id,serviceVersion:x.version,...(x.kind==='package'?{packageName:x.name}:{})}));}
export function serviceOffer(s,id){const x=(s.services||[]).find(x=>x.id===id&&!x.archived);if(!x)throw Error('Choose an active service.');const basis=pricingBasis(x),single=x.kind==='service'?x.items[0]:null;return {id:uid(),name:x.name,...basis,description:single?(single.details||(single.description!==x.name?single.description:'')):x.items.map(i=>`${i.description} × ${i.quantity}`).join('\n'),rate:single?single.rate:x.amount,mode:'required',group:'',min:single?.quantity||1,max:single?.quantity||1,quantity:single?.quantity||1,serviceId:x.id,serviceVersion:x.version,items:serviceItems(s,id)};}
export function validateOffers(input=[]){
 if(!Array.isArray(input)||input.length>20)throw Error('Use up to 20 service options.');
 const seen=new Set();return input.map(x=>{const id=clean(x.id),name=clean(x.name),description=clean(x.description),rate=Number(x.rate),min=Number(x.min),max=Number(x.max),quantity=Number(x.quantity),mode=x.mode,group=clean(x.group),basis=pricingBasis(x);
 if(!/^[\w-]{1,100}$/.test(id)||seen.has(id))throw Error('Service options must have unique identifiers.');seen.add(id);
 if(!name||name.length>100||description.length>2000)throw Error('Add a service name and keep descriptions under 2,000 characters.');
 if(!Number.isSafeInteger(rate)||rate<1||rate>100000000)throw Error('Set a positive service price.');
 if(!['required','optional','choice'].includes(mode))throw Error('Choose Required, Optional, or Choose one.');
 if(mode==='choice'&&(!group||group.length>60))throw Error('Give each choose-one option a group name.');
 if(![min,max,quantity].every(validQuantity)||max<min||quantity<min||quantity>max)throw Error('Use positive quantities with up to two decimals, within the minimum and maximum.');
 return {id,name,description,rate,min,max,quantity,...basis,mode,group:mode==='choice'?group:'',...(x.serviceId?{serviceId:clean(x.serviceId),serviceVersion:x.serviceVersion,items:copy(x.items||[])}:{})};});
}
export function defaultSelections(offers=[]){const groups=new Set();const selected=offers.filter(o=>o.mode==='required'||(o.mode==='choice'&&!groups.has(o.group)&&groups.add(o.group))).map(o=>({id:o.id,quantity:o.quantity}));return selected.length?selected:offers.length?[{id:offers[0].id,quantity:offers[0].quantity}]:[];}
export function quoteOffers(input,selections=defaultSelections(input)){
 const offers=validateOffers(input);if(!Array.isArray(selections))throw Error('Choose your services.');const seen=new Set(),groups=new Map();
 const items=selections.map(x=>{if(seen.has(x.id))throw Error('A service can only be selected once.');seen.add(x.id);const o=offers.find(o=>o.id===x.id);if(!o)throw Error('This service option is no longer available.');const quantity=Number(x.quantity);if(!validQuantity(quantity)||quantity<o.min||quantity>o.max)throw Error(`${o.name}: choose a quantity from ${o.min} to ${o.max}.`);if(o.mode==='choice')groups.set(o.group,(groups.get(o.group)||0)+1);return {...copy(o),quantity,amount:Math.round(o.rate*quantity)};});
 if(offers.some(o=>o.mode==='required'&&!seen.has(o.id)))throw Error('Include all required services.');
 if(offers.some(o=>o.mode==='choice'&&groups.get(o.group)!==1))throw Error('Select exactly one option from each group.');
 const amount=items.reduce((sum,x)=>sum+x.amount,0);if(!Number.isSafeInteger(amount)||amount<1||amount>10000000000)throw Error('Select at least one service with a valid total.');return {items,amount,estimated:hasTimePricing(items),selections:items.map(({id,quantity})=>({id,quantity}))};
}
export function selectionModeFor(offers=[]){if(!offers.length||offers.every(o=>o.mode==='required'))return 'fixed';if(offers.every(o=>o.mode==='optional'))return 'multiple';if(offers.every(o=>o.mode==='choice'&&o.group===offers[0].group))return 'single';return 'advanced';}
export function applySelectionMode(offers,mode='advanced'){if(!['fixed','single','multiple','advanced'].includes(mode))throw Error('Choose how clients select services.');return offers.map(o=>mode==='advanced'?o:{...o,mode:mode==='fixed'?'required':mode==='single'?'choice':'optional',group:mode==='single'?'Package':''});}
