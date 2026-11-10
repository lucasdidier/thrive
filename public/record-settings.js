import {currencies,currencyCode,preserveRecordCurrencies} from './currency.js';
import {createProject,saveClient,updateProject,defaultPlan,uid} from './domain.js';
import {L} from './i18n.js';
const tags=value=>[...new Set((Array.isArray(value)?value:String(value||'').split(',')).map(x=>x.trim()).filter(Boolean))];
export function projectCurrency(s,p){return p?.currency||currencyCode(s);}
// A project's fee belongs to its billing agreement once there is one: a proposal or contract with project
// billing on, an accepted agreement, or invoices issued from the billing plan. Until then the project panel
// sets it, even after time is logged or hourly invoices are drafted.
export function billingDocument(s,p){const docs=p?s.documents.filter(d=>d.projectId===p.id&&d.billing):[];return docs.find(d=>d.id===p.billingDocumentId)||docs[0]||null;}
export function budgetLocked(s,p){return !!p&&!!(p.accepted||p.versions?.length||billingDocument(s,p)||[...s.invoices,...(s.invoiceDrafts||[])].some(i=>i.projectId===p.id&&i.ruleId));}
export function saveProjectSettings(s,data,id){
 const draft=structuredClone(s),old=draft.projects.find(p=>p.id===id),locked=budgetLocked(draft,old);
 let clientId=data.clientId;
 if(clientId==='__new'){const email=String(data.clientEmail||'').trim().toLowerCase();const existing=draft.clients.find(c=>c.email.toLowerCase()===email);if(existing?.archived)throw Error(L('Restore the existing client before using this email.'));clientId=existing?.id||saveClient(draft,{name:data.clientName,contact:data.clientContact||data.clientName,email,type:data.clientType||'individual'}).id;}
 const currency=data.currency||old?.currency||draft.clients.find(c=>c.id===clientId)?.currency||currencyCode(s),rate=data.hourlyRate===''||data.hourlyRate==null?null:Math.round(Number(data.hourlyRate)*100),budgetType=data.budgetType||'none',budget=Math.round(Number(data.budget||0)*100),hours=Number(data.budgetHours||0),deposit=Number(data.deposit||s.settings.deposit),selected=tags(data.tags);
 if(!Object.hasOwn(currencies,currency))throw Error(L('Choose a supported currency.'));
 if(rate!==null&&(!Number.isSafeInteger(rate)||rate<0||rate>100000000))throw Error(L('Enter a valid hourly rate.'));
 if(selected.length>20||selected.some(t=>t.length>60))throw Error(L('Use up to 20 tags of 60 characters.'));
 if(!locked){if(!['none','fixed','hours','time'].includes(budgetType))throw Error(L('Choose a budget type.'));if(!Number.isSafeInteger(budget)||budget<0||budget>10000000000||(budgetType==='fixed'&&budget<1))throw Error(L('Enter a valid project fee.'));if(!Number.isFinite(hours)||hours<0||(budgetType==='hours'&&hours<=0))throw Error(L('Enter a positive hours budget.'));if(!Number.isInteger(deposit)||deposit<1||deposit>100)throw Error(L('Enter a deposit from 1 to 100%.'));}
 if(old&&currency!==projectCurrency(draft,old)){if(locked&&old.budget)old.budgetCurrency ||= projectCurrency(draft,old);preserveRecordCurrencies(draft);}
 const p=old?updateProject(draft,id,{...old,...data,clientId}):createProject(draft,{...data,clientId,budget:budgetType==='fixed'?budget:100});
 if(!locked){delete p.budgetCurrency;p.budget=budgetType==='fixed'?budget:0;p.budgetType=budgetType;p.budgetHours=hours;p.deposit=deposit;p.billingPlan=p.budget?defaultPlan(p.budget,deposit):[];p.needsPricing=!p.budget;p.currency=currency;}
 p.currency=currency;p.hourlyRate=rate??(currency!==currencyCode(s)?old?.hourlyRate??draft.clients.find(c=>c.id===clientId)?.hourlyRate??0:null);p.tags=selected;p.notes=String(data.notes||'').trim().slice(0,5000);p.billable=data.billable!==false;
 Object.assign(s,draft);return p;
}
export function saveClientSettings(s,data,id){const draft=structuredClone(s),rate=data.hourlyRate===''||data.hourlyRate==null?null:Math.round(Number(data.hourlyRate)*100);if(rate!==null&&(!Number.isSafeInteger(rate)||rate<0||rate>100000000))throw Error(L('Enter a valid hourly rate.'));if(data.currency&&!Object.hasOwn(currencies,data.currency))throw Error(L('Choose a supported currency.'));const c=saveClient(draft,{...data,contact:data.contact||data.name},id);Object.assign(c,{hourlyRate:rate,currency:data.currency||null,notes:String(data.notes||'').trim().slice(0,5000)});Object.assign(s,draft);return c;}
