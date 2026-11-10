import {L,language} from './i18n.js';
// Workspace defaults and record currencies. Amounts are integer hundredths; no FX conversion.
// Active ISO 4217 currencies. Names come from Intl so every runtime labels them the same way.
const currencyCodes='AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW'.split(' ');
const currencyNames=(()=>{try{return new Intl.DisplayNames([language(),'en'],{type:'currency'});}catch{return new Intl.DisplayNames(['en'],{type:'currency'});}})(),capitalize=s=>s[0].toLocaleUpperCase(language())+s.slice(1);
export const currencies=Object.fromEntries(currencyCodes.map(code=>[code,capitalize(currencyNames.of(code)||code)]));
export function currencyCode(state){const code=state?(state.settings?.currency||'USD'):(globalThis.document?.documentElement?.dataset.currency||'USD');return Object.hasOwn(currencies,code)?code:'USD';}
export function formatMoney(cents,code=currencyCode()){return new Intl.NumberFormat(language(),{style:'currency',currency:code,minimumFractionDigits:cents%100?2:0,maximumFractionDigits:2}).format(cents/100);}
export function currencyLocked(s){return ['projects','documents','invoices','invoiceDrafts','services','time','submissions'].some(k=>s[k]?.length)||!!s.settings.hourlyRate||['client','project'].some(k=>s.customFields?.[k]?.some(f=>f.type==='currency'))||s.automation?.workflows?.some(w=>w.steps?.some(x=>x.config?.amount));}
// Each billing currency can carry its own default hourly rate; the default currency uses settings.hourlyRate.
export function defaultHourlyRate(s,code=currencyCode(s)){return code!==currencyCode(s)&&s.settings?.currencyRates?.[code]!=null?s.settings.currencyRates[code]:s.settings?.hourlyRate??0;}
export const billingCurrencies=s=>[...new Set([currencyCode(s),...Object.keys(s.settings?.currencyRates||{})])].filter(code=>Object.hasOwn(currencies,code));
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
 if(!Object.hasOwn(currencies,code))throw Error(L('Choose a supported currency.'));
 if(code!==currencyCode(s)){preserveRecordCurrencies(s);s.settings.currency=code;}
}
export function billingCurrency(s,record){return record?.budgetCurrency||record?.currency||s.projects.find(p=>p.id===record?.projectId)?.currency||s.clients?.find(c=>c.id===record?.clientId)?.currency||currencyCode(s);}
export function validateCurrency(s,old){
 if(!Object.hasOwn(currencies,s.settings.currency||'USD'))throw Error(L('Choose a supported currency.'));
 for(const key of ['clients','projects','documents','invoices','invoiceDrafts','time','services'])for(const r of s[key]||[])if(r.currency&&!Object.hasOwn(currencies,r.currency))throw Error(L('Choose a supported currency.'));
 for(const d of s.documents||[])for(const v of d.versions||[])if(v.currency&&!Object.hasOwn(currencies,v.currency))throw Error(L('Invalid document currency.'));
 // Currency defaults may change; saved financial records may not be relabelled.
 if(old){
  if(currencyCode(s)!==currencyCode(old))for(const p of old.projects||[]){const next=s.projects.find(x=>x.id===p.id);if(next&&!next.currency)throw Error(L('Preserve existing project currencies before changing the workspace currency.'));}
  for(const key of ['time','invoiceDrafts','documents','services'])for(const r of old[key]||[]){const next=s[key]?.find(x=>x.id===r.id);if(next&&recordCurrency(s,next)!==recordCurrency(old,r))throw Error(L('Existing {key} currency cannot change. Create a new record in the new currency.',{key}));}
 }
}
export function moneyGroups(s,rows,value){const groups=new Map();for(const row of rows){const code=recordCurrency(s,row.raw||row);groups.set(code,(groups.get(code)||0)+value(row));}return [...groups].map(([code,n])=>formatMoney(n,code)).join(' + ')||formatMoney(0,currencyCode(s));}
