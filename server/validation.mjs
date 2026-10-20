import {validateCurrency} from '../public/currency.js';
import {validateOnboarding} from '../public/onboarding-domain.js';
import {validatePortal} from '../public/portal-domain.js';
import {calculateInvoice} from '../public/invoice-domain.js';
import {validateTimeWorkspace} from '../public/time-domain.js';
import {validateDocumentDesign} from '../public/document-design.js';
import {pricingBasis} from '../public/pricing.js';
import {normalizeQuestions} from '../public/form-domain.js';
import {fieldsFor,fieldTypes,validateFieldValue} from '../public/custom-fields-domain.js';
import {validateShareLinks} from '../public/share-domain.js';
import {validateEmailDraft} from '../public/communications-domain.js';
export function validateWorkspace(s,old){
 validateShareLinks(s,old);
 if(!s||typeof s!=='object'||s.workspaceSchema!==3||!s.settings||typeof s.settings.business!=='string'||typeof s.settings.name!=='string')throw Error('Invalid workspace data.');
 validateCurrency(s,old);validateOnboarding(s);
 if(s.settings.portalDefaults){const p=s.settings.portalDefaults;if(typeof p.title!=='string'||!p.title.trim()||p.title.length>100||typeof p.intro!=='string'||p.intro.length>1000||!p.sections||['documents','forms','invoices','projects','meetings'].some(k=>typeof p.sections[k]!=='boolean'))throw Error('Invalid workspace portal defaults.');}
 if(s.settings.emailFollowUps!==undefined){const choices=s.settings.emailFollowUps;if(!choices||typeof choices!=='object'||Array.isArray(choices)||Object.keys(choices).length>2000)throw Error('Invalid email reply preferences.');for(const [id,choice]of Object.entries(choices)){if(!id||id.length>512||!choice||typeof choice.messageId!=='string'||!choice.messageId||choice.messageId.length>512||!['reply','done'].includes(choice.status))throw Error('Invalid email reply preference.');}}
 if(s.settings.formEmailNotifications!==undefined&&typeof s.settings.formEmailNotifications!=='boolean')throw Error('Invalid form notification setting.');
 for(const key of ['clients','projects','documents','forms','submissions','invoices','time','activity','workflows']){if(!Array.isArray(s[key]))throw Error(`Missing workspace collection: ${key}.`);const ids=new Set();for(const r of s[key]){if(!r||typeof r.id!=='string'||ids.has(r.id))throw Error(`Invalid or duplicate ${key} record.`);ids.add(r.id);}}
 for(const c of s.clients){if(c.type!==undefined&&!['company','individual'].includes(c.type))throw Error('Invalid client type.');if(c.logo!==undefined&&(typeof c.logo!=='string'||c.logo.length>150000||(c.logo&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(c.logo))))throw Error('Invalid client logo.');}
 for(const m of s.scheduling?.meetings||[])if(m.projectId&&!s.projects.some(p=>p.id===m.projectId&&p.clientId===m.clientId))throw Error('Invalid meeting project.');
 for(const f of s.forms){if(f.clientId&&!s.clients.some(c=>c.id===f.clientId))throw Error('Invalid form client.');if(f.projectId&&!s.projects.some(p=>p.id===f.projectId&&p.clientId===f.clientId))throw Error('Invalid form project.');}
 for(const c of s.clients)if(c.portal)validatePortal(s,c.id,c.portal);
 validateTimeWorkspace(s,old);
 for(const i of s.invoices.filter(i=>i.items?.some(l=>l.timeSources))){const computed=calculateInvoice(i.items,i.taxRate);for(const key of ['amount','subtotal','taxAmount'])if(i[key]!==computed[key])throw Error('Invoice time totals do not match source entries.');for(let n=0;n<i.items.length;n++)if(i.items[n].amount!==computed.items[n].amount)throw Error('Invoice time line amount is invalid.');}
 for(const e of ['client','project']){const defs=fieldsFor(s,e,true),ids=new Set(),names=new Set();if(defs.length>50)throw Error('Too many custom fields.');for(const f of defs){if(!/^cf_[\w-]+$/.test(f.id)||ids.has(f.id)||!Object.hasOwn(fieldTypes,f.type)||typeof f.name!=='string'||!f.name.trim()||f.name.length>60||names.has(f.name.toLowerCase()))throw Error('Invalid custom field definition.');ids.add(f.id);names.add(f.name.toLowerCase());if(!Array.isArray(f.options)||f.options.length>50)throw Error('Invalid custom field options.');const options=new Set();for(const o of f.options){if(typeof o.id!=='string'||options.has(o.id)||typeof o.label!=='string'||!o.label.trim())throw Error('Invalid field option.');options.add(o.id);}const prev=fieldsFor(old||{},e,true).find(x=>x.id===f.id);if(prev&&prev.type!==f.type)throw Error('Custom field types are immutable.');}
 for(const r of s[e==='client'?'clients':'projects'])for(const [id,value]of Object.entries(r.customFields||{})){const f=defs.find(f=>f.id===id);if(!f)throw Error('A custom field definition is missing.');validateFieldValue({...f,archived:false},value);}
 for(const f of fieldsFor(old||{},e,true))if(!ids.has(f.id))throw Error('Archive custom fields instead of deleting them.');}
 for(const d of s.documents)if(d.design)validateDocumentDesign(d.design);
 for(const x of s.services||[])pricingBasis(x);
 for(const f of s.forms)if(f.questions!==undefined)normalizeQuestions(f.questions);
 for(const sub of s.submissions){if(sub.answers!==undefined&&(!Array.isArray(sub.answers)||sub.answers.length>50))throw Error('Invalid form answers.');const previous=old?.submissions.find(x=>x.id===sub.id);if(previous?.answers&&JSON.stringify(previous)!==JSON.stringify(sub))throw Error('Saved form responses cannot be rewritten.');}
 for(const p of s.projects)if(!s.clients.some(c=>c.id===p.clientId)||!Array.isArray(p.phases)||!Array.isArray(p.billingPlan))throw Error('Invalid project relationship.');
 if(s.emailDrafts!==undefined){if(!Array.isArray(s.emailDrafts)||s.emailDrafts.length>1000)throw Error('Invalid email draft collection.');const ids=new Set();for(const d of s.emailDrafts){validateEmailDraft(s,d);if(ids.has(d.id))throw Error('Duplicate email draft.');ids.add(d.id);}}
 for(const d of old?.documents||[])for(const v of d.versions||[]){const n=s.documents.find(x=>x.id===d.id)?.versions?.find(x=>x.number===v.number);if(!n)throw Error('Published document versions cannot be deleted.');for(const key of ['currency','design','templateId','showPricing','selectionMode','title','kind','responseMode','clientId','projectId','billing','phases','scope','deliverables','terms','offers','client','business','due','createdAt'])if(JSON.stringify(n[key])!==JSON.stringify(v[key]))throw Error('Published content is immutable. Create a new document revision.');if(v.completedAt)for(const key of ['selections','agreedItems','budget','billingPlan','pricingEstimated','status','completedAt'])if(JSON.stringify(n[key])!==JSON.stringify(v[key]))throw Error('Agreed services and pricing are immutable.');}
 for(const i of s.invoices){if(!Number.isSafeInteger(i.amount)||i.amount<0||!Number.isSafeInteger(i.paid)||i.paid<0||i.paid>i.amount)throw Error('Invalid invoice balance.');}
 for(const i of old?.invoices||[]){const next=s.invoices.find(x=>x.id===i.id);if(!next)throw Error('Issued invoices cannot be deleted.');for(const key of ['currency','number','amount','items','taxRate','subtotal','tax','clientId','projectId','issued','due','design','clientName','clientEmail','business','agreedItems','timeBilling'])if(JSON.stringify(next[key])!==JSON.stringify(i[key]))throw Error(`Issued invoice ${i.number} cannot change its ${key}.`);if(next.paid<i.paid)throw Error('Recorded invoice payments cannot be removed.');for(const p of i.payments||[])if(!next.payments?.some(n=>JSON.stringify(n)===JSON.stringify(p)))throw Error('Recorded payments are immutable.');}
 return s;
}
