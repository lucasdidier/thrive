import {currencies,currencyCode} from './currency.js';
import {createProject,saveClient,updateProject,defaultPlan,uid} from './domain.js';
const tags=value=>[...new Set((Array.isArray(value)?value:String(value||'').split(',')).map(x=>x.trim()).filter(Boolean))];
export function projectCurrency(s,p){return p?.currency||currencyCode(s);}
export function commercialLocked(s,p){return !!p&&(p.accepted||p.versions?.length||s.documents.some(d=>d.projectId===p.id)||s.invoices.some(i=>i.projectId===p.id)||s.invoiceDrafts?.some(i=>i.projectId===p.id)||s.time.some(t=>t.projectId===p.id));}
export function saveProjectSettings(s,data,id){
 const draft=structuredClone(s),old=draft.projects.find(p=>p.id===id),locked=commercialLocked(draft,old);
 let clientId=data.clientId;
 if(clientId==='__new'){const email=String(data.clientEmail||'').trim().toLowerCase();const existing=draft.clients.find(c=>c.email.toLowerCase()===email);if(existing?.archived)throw Error('Restore the existing client before using this email.');clientId=existing?.id||saveClient(draft,{name:data.clientName,contact:data.clientContact||data.clientName,email,type:data.clientType||'individual'}).id;}
 const currency=data.currency||old?.currency||currencyCode(s),rate=data.hourlyRate===''||data.hourlyRate==null?null:Math.round(Number(data.hourlyRate)*100),budgetType=data.budgetType||'none',budget=Math.round(Number(data.budget||0)*100),hours=Number(data.budgetHours||0),deposit=Number(data.deposit||s.settings.deposit),names=String(data.phases??s.settings.phases.join('\n')).split('\n').map(x=>x.trim()).filter(Boolean),selected=tags(data.tags);
 if(!Object.hasOwn(currencies,currency))throw Error('Choose a supported currency.');
 if(rate!==null&&(!Number.isSafeInteger(rate)||rate<0||rate>100000000))throw Error('Enter a valid hourly rate.');
 if(currency!==currencyCode(s)&&rate===null)throw Error('Set a project hourly rate when choosing a different currency. No currency conversion is applied.');
 if(selected.length>20||selected.some(t=>t.length>60))throw Error('Use up to 20 tags of 60 characters.');
 if(!locked){if(!['none','fixed','hours','time'].includes(budgetType))throw Error('Choose a budget type.');if(!Number.isSafeInteger(budget)||budget<0||budget>10000000000||(budgetType==='fixed'&&budget<1))throw Error('Enter a valid project fee.');if(!Number.isFinite(hours)||hours<0||(budgetType==='hours'&&hours<=0))throw Error('Enter a positive hours budget.');if(!names.length||names.length>8||new Set(names.map(x=>x.toLowerCase())).size!==names.length||names.some(x=>x.length>80))throw Error('Enter one to eight unique phase names.');if(!Number.isInteger(deposit)||deposit<1||deposit>100)throw Error('Enter a deposit from 1 to 100%.');}
 const p=old?updateProject(draft,id,{...old,...data,clientId}):createProject(draft,{...data,clientId,budget:budgetType==='fixed'?budget:100});
 if(!locked){p.phases=names.map((name,i)=>({id:old?.phases[i]?.id||uid(),name,done:false}));p.budget=budgetType==='fixed'?budget:0;p.budgetType=budgetType;p.budgetHours=hours;p.deposit=deposit;p.billingPlan=p.budget?defaultPlan(p.budget,deposit,p.phases):[];p.needsPricing=!p.budget;p.currency=currency;}
 p.hourlyRate=rate;p.tags=selected;p.notes=String(data.notes||'').trim().slice(0,5000);p.billable=data.billable!==false;
 Object.assign(s,draft);return p;
}
export function saveClientSettings(s,data,id){const draft=structuredClone(s),rate=data.hourlyRate===''||data.hourlyRate==null?null:Math.round(Number(data.hourlyRate)*100);if(rate!==null&&(!Number.isSafeInteger(rate)||rate<0||rate>100000000))throw Error('Enter a valid hourly rate.');if(data.currency&&!Object.hasOwn(currencies,data.currency))throw Error('Choose a supported currency.');const c=saveClient(draft,{...data,contact:data.contact||data.name},id);Object.assign(c,{hourlyRate:rate,currency:data.currency||null,notes:String(data.notes||'').trim().slice(0,5000)});Object.assign(s,draft);return c;}
