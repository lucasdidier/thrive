// Workspace defaults and record currencies. Amounts are integer hundredths; no FX conversion.
export const currencies={USD:'US dollar',EUR:'Euro',GBP:'British pound',CAD:'Canadian dollar',AUD:'Australian dollar',NZD:'New Zealand dollar',CHF:'Swiss franc',SEK:'Swedish krona',NOK:'Norwegian krone',DKK:'Danish krone',PLN:'Polish złoty',BRL:'Brazilian real',INR:'Indian rupee',SGD:'Singapore dollar',HKD:'Hong Kong dollar',ZAR:'South African rand',MXN:'Mexican peso'};
export function currencyCode(state){const code=state?(state.settings?.currency||'USD'):(globalThis.document?.documentElement?.dataset.currency||'USD');return Object.hasOwn(currencies,code)?code:'USD';}
export function formatMoney(cents,code=currencyCode()){return new Intl.NumberFormat('en-US',{style:'currency',currency:code,minimumFractionDigits:cents%100?2:0,maximumFractionDigits:2}).format(cents/100);}
export function currencyLocked(s){return ['projects','documents','invoices','invoiceDrafts','services','time','submissions'].some(k=>s[k]?.length)||!!s.settings.hourlyRate||['client','project'].some(k=>s.customFields?.[k]?.some(f=>f.type==='currency'))||s.automation?.workflows?.some(w=>w.steps?.some(x=>x.config?.amount));}
export function recordCurrency(s,record){return record?.budgetCurrency||record?.currency||s.projects.find(p=>p.id===record?.projectId)?.currency||currencyCode(s);}
// Materialize inherited values before changing defaults. No exchange-rate conversion.
export function preserveRecordCurrencies(s){
 const code=currencyCode(s);
 for(const p of s.projects||[]){p.currency ||= code;if(p.hourlyRate==null)p.hourlyRate=s.settings.hourlyRate||0;}
 for(const c of s.clients||[])if(c.hourlyRate!=null&&!c.currency)c.currency=code;
 for(const key of ['documents','invoices','invoiceDrafts','time','services'])for(const r of s[key]||[]){r.currency ||= recordCurrency(s,r);if(key==='time'&&r.rate==null)r.rate=s.projects.find(p=>p.id===r.projectId)?.hourlyRate??s.settings.hourlyRate??0;}
 for(const d of [...s.documents||[],...s.projects||[]])for(const v of d.versions||[])v.currency ||= d.currency||code;
}
export function setWorkspaceCurrency(s,code){
 if(!Object.hasOwn(currencies,code))throw Error('Choose a supported currency.');
 if(code!==currencyCode(s)){preserveRecordCurrencies(s);s.settings.currency=code;}
}
export function billingCurrency(s,record){return record?.budgetCurrency||record?.currency||s.projects.find(p=>p.id===record?.projectId)?.currency||s.clients?.find(c=>c.id===record?.clientId)?.currency||currencyCode(s);}
export function validateCurrency(s,old){
 if(!Object.hasOwn(currencies,s.settings.currency||'USD'))throw Error('Choose a supported currency.');
 for(const key of ['clients','projects','documents','invoices','invoiceDrafts','time','services'])for(const r of s[key]||[])if(r.currency&&!Object.hasOwn(currencies,r.currency))throw Error('Choose a supported currency.');
 for(const d of s.documents||[])for(const v of d.versions||[])if(v.currency&&!Object.hasOwn(currencies,v.currency))throw Error('Invalid document currency.');
 // Currency defaults may change; saved financial records may not be relabelled.
 if(old){
  if(currencyCode(s)!==currencyCode(old))for(const p of old.projects||[]){const next=s.projects.find(x=>x.id===p.id);if(next&&!next.currency)throw Error('Preserve existing project currencies before changing the workspace currency.');}
  for(const key of ['time','invoiceDrafts','documents','services'])for(const r of old[key]||[]){const next=s[key]?.find(x=>x.id===r.id);if(next&&recordCurrency(s,next)!==recordCurrency(old,r))throw Error('Existing '+key+' currency cannot change. Create a new record in the new currency.');}
 }
}
export function moneyGroups(s,rows,value){const groups=new Map();for(const row of rows){const code=recordCurrency(s,row.raw||row);groups.set(code,(groups.get(code)||0)+value(row));}return [...groups].map(([code,n])=>formatMoney(n,code)).join(' + ')||formatMoney(0,currencyCode(s));}
