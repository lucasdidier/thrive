import {normalizeTimeLine,validateTimeInvoice,timeInvoiceData} from './time-domain.js';
import {pricingBasis} from './pricing.js';
import {uid,today,addActivity,initBilling} from './domain.js';
import {validateInvoiceDesign,defaultInvoiceDesign} from './invoice-design.js';
const clean=x=>String(x??'').trim();
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export function calculateInvoice(items,taxRate=0){
 if(!Array.isArray(items)||!items.length||items.length>30)throw Error('Add between 1 and 30 line items.');
 const lines=items.map(item=>{const description=clean(item.description),details=clean(item.details),quantity=Number(item.quantity),rate=Number(item.rate);if(details.length>2000)throw Error('Keep line item details under 2,000 characters.');if(!description||description.length>300)throw Error('Add a description to each line item (up to 300 characters).');if(!Number.isFinite(quantity)||quantity<=0||quantity>100000||(!item.timeSources&&Math.abs(quantity*100-Math.round(quantity*100))>0.00001))throw Error('Use positive quantities with up to two decimal places.');if(!Number.isSafeInteger(rate)||rate<0||rate>100000000)throw Error('Enter a valid unit price.');const tracked=item.timeSources?normalizeTimeLine(item):null,amount=tracked?.amount??Math.round(quantity*rate);if(!Number.isSafeInteger(amount))throw Error('Line item amount is too large.');return {description,...(details?{details}:{}),quantity,rate,amount,...(tracked||{}),...(item.billingModel||item.unit?pricingBasis(item):{}),...(item.serviceId?{serviceId:clean(item.serviceId),serviceVersion:item.serviceVersion}:{}),...(item.packageName?{packageName:clean(item.packageName)}:{})};});
 const subtotal=lines.reduce((n,l)=>n+l.amount,0),tax=Number(taxRate);if(!Number.isFinite(tax)||tax<0||tax>100||Math.abs(tax*100-Math.round(tax*100))>0.00001)throw Error('Enter a tax rate between 0 and 100, with up to two decimal places.');const taxAmount=Math.round(subtotal*tax/100),amount=subtotal+taxAmount;if(!Number.isSafeInteger(amount)||amount<1||amount>10000000000)throw Error('Invoice total must be between 0.01 and 100,000,000 in your workspace currency.');return {items:lines,subtotal,taxRate:tax,taxAmount,amount};
}
export function saveInvoiceDefaults(s,data){const design=validateInvoiceDesign(data);s.settings.invoiceDesign=design;addActivity(s,'Invoice template updated','Applies to new invoices','document');return design;}
export function prepareInvoice(s,data){
 validateTimeInvoice(s,data,data.id);
 const c=s.clients.find(c=>c.id===data.clientId&&!c.archived);if(!c)throw Error('Choose an active client.');const p=data.projectId?s.projects.find(p=>p.id===data.projectId):null;if(data.projectId&&(!p||p.archived||p.status==='cancelled'||p.clientId!==c.id))throw Error('Choose an active project belonging to this client.');
 const issued=clean(data.issued),due=clean(data.due);if(!validDate(issued)||!validDate(due)||due<issued)throw Error('Choose valid dates, with the due date on or after the issue date.');const notes=clean(data.notes),paymentInstructions=clean(data.paymentInstructions),billingAddress=clean(data.billingAddress);if(notes.length>2000||paymentInstructions.length>3000||billingAddress.length>1000)throw Error('Shorten the notes, payment instructions, or billing address.');
 return {...calculateInvoice(data.items,data.taxRate),...(data.items.some(l=>l.timeSources)?{timeBilling:structuredClone(data.timeBilling)}:{}),projectId:p?.id||null,clientId:c.id,clientName:c.name,clientEmail:c.email,projectName:p?.name||'',business:s.settings.business,currency:p?.currency||s.settings.currency||'USD',issued,due,notes,paymentInstructions,billingAddress,design:validateInvoiceDesign(data.design||s.settings.invoiceDesign||defaultInvoiceDesign()),kind:'manual',label:'Services',paid:0,payments:[]};
}
export function createManualInvoice(s,data,key){if(!key)throw Error('Invoice operation identifier required.');const existing=s.invoices.find(i=>i.creationKey===key);if(existing)return existing;const draft=prepareInvoice(s,{...data,id:undefined});initBilling(s);const number=`INV-${String(Math.max(0,...s.invoices.map(i=>Number(i.number.split('-')[1])||0))+1).padStart(3,'0')}`,i={...draft,id:uid(),number,creationKey:key,createdAt:new Date().toISOString()};s.invoices.unshift(i);addActivity(s,'Invoice created',`${number} · ${i.clientName}`,'document');return i;}

export function draftEstimate(d){try{return calculateInvoice(d.items,d.taxRate).amount;}catch{return null;}}
export function saveInvoiceDraft(s,data,id){
 if(id&&s.invoices.some(i=>i.id===id))throw Error('Issued invoices cannot be edited.');
 const old=id?(s.invoiceDrafts||[]).find(i=>i.id===id):null;
 if(id&&!old)throw Error('Draft not found.');
 const title=clean(data.title)||'Untitled invoice';if(title.length>140)throw Error('Use a title of up to 140 characters.');
 if(!Array.isArray(data.items)||data.items.length>30)throw Error('Use up to 30 line items.');
 validateTimeInvoice(s,data,id);
 const items=data.items.map(x=>{const description=clean(x.description),details=clean(x.details),quantity=Number(x.quantity),rate=Number(x.rate);if(details.length>2000||description.length>300||!Number.isFinite(quantity)||quantity<0||quantity>100000||!Number.isSafeInteger(rate)||rate<0||rate>100000000)throw Error('Check the line item values.');return {description,...(details?{details}:{}),quantity,rate,...(x.timeSources?normalizeTimeLine(x):{}),...(x.billingModel||x.unit?pricingBasis(x):{}),...(x.serviceId?{serviceId:clean(x.serviceId),serviceVersion:x.serviceVersion}:{}),...(x.packageName?{packageName:clean(x.packageName)}:{})};});
 for(const [key,max] of [['notes',2000],['paymentInstructions',3000],['billingAddress',1000]])if(clean(data[key]).length>max)throw Error('Shorten the invoice details.');
 const d={id:old?.id||uid(),title,currency:s.projects.find(p=>p.id===data.projectId)?.currency||s.settings.currency||'USD',...(items.some(l=>l.timeSources)?{timeBilling:structuredClone(data.timeBilling)}:{}),clientId:clean(data.clientId),projectId:clean(data.projectId),issued:clean(data.issued),due:clean(data.due),items,taxRate:Number(data.taxRate)||0,notes:clean(data.notes),billingAddress:clean(data.billingAddress),paymentInstructions:clean(data.paymentInstructions),design:validateInvoiceDesign(data.design||s.settings.invoiceDesign||defaultInvoiceDesign()),status:'draft',createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
 initBilling(s);if(old)Object.assign(old,d);else s.invoiceDrafts.unshift(d);addActivity(s,'Invoice draft saved',title,'document');return old||d;
}
export function issueInvoiceDraft(s,id){
 const existing=s.invoices.find(i=>i.id===id);if(existing)return existing;
 const d=(s.invoiceDrafts||[]).find(i=>i.id===id);if(!d)throw Error('Draft not found.');
 const prepared=prepareInvoice(s,d),number=`INV-${String(Math.max(0,...s.invoices.map(i=>Number(i.number.split('-')[1])||0))+1).padStart(3,'0')}`;
 const i={...prepared,id:d.id,title:d.title,number,creationKey:d.id,createdAt:d.createdAt,issuedAt:new Date().toISOString()};
 s.invoices.unshift(i);s.invoiceDrafts=s.invoiceDrafts.filter(x=>x.id!==id);addActivity(s,'Invoice issued',`${number} · ${i.clientName}`,'document');return i;
}
export function deleteInvoiceDraft(s,id){if(!(s.invoiceDrafts||[]).some(i=>i.id===id))throw Error('Draft not found.');s.invoiceDrafts=s.invoiceDrafts.filter(i=>i.id!==id);}

export function createTimeInvoiceDraft(s,options){return saveInvoiceDraft(s,timeInvoiceData(s,options));}
