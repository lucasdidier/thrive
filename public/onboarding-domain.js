import {currencies,currencyLocked} from './currency.js';
import {verticals,starterServices} from './catalog-starters.js';
import {saveService} from './services-domain.js';
import {saveWorkflow} from './workflow-domain.js';
import {pricingBasis,rateUnits} from './pricing.js';
import {L,language} from './i18n.js';
export const countryCodes='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const countryNames=new Intl.DisplayNames([language(),'en'],{type:'region'});
export const countryFlag=code=>String.fromCodePoint(...[...code.toUpperCase()].map(c=>0x1f1a5+c.charCodeAt(0)));
// Labels lead with the flag; the stored value stays the ISO code.
export const countries=countryCodes.map(code=>[code,countryNames.of(code)]).sort((a,b)=>a[1].localeCompare(b[1],language())).map(([code,name])=>[code,`${countryFlag(code)} ${name}`]);
export const suggestedCurrency=country=>({US:'USD',GB:'GBP',CA:'CAD',AU:'AUD',NZ:'NZD',CH:'CHF',SE:'SEK',NO:'NOK',DK:'DKK',PL:'PLN',BR:'BRL',IN:'INR',SG:'SGD',HK:'HKD',ZA:'ZAR',MX:'MXN',JP:'JPY',CN:'CNY',KR:'KRW',TW:'TWD',TH:'THB',VN:'VND',ID:'IDR',MY:'MYR',PH:'PHP',AE:'AED',SA:'SAR',IL:'ILS',TR:'TRY',EG:'EGP',NG:'NGN',KE:'KES',MA:'MAD',AR:'ARS',CL:'CLP',CO:'COP',PE:'PEN',UY:'UYU',CZ:'CZK',HU:'HUF',RO:'RON',BG:'BGN',RS:'RSD',UA:'UAH',IS:'ISK',QA:'QAR',KW:'KWD',PK:'PKR',BD:'BDT',LK:'LKR',GH:'GHS',TN:'TND'}[country]||('AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK'.split(' ').includes(country)?'EUR':null));
export const needsOnboarding=s=>!!s.settings.onboarding&&!s.settings.onboarding.completedAt;
export const requiresOnboarding=s=>needsOnboarding(s)&&['profile','vertical'].includes(s.settings.onboarding.step||'profile');
export function saveOnboardingProfile(s,data){
 const name=String(data.name||'').trim(),businessName=String(data.businessName||'').trim(),country=String(data.country||''),currency=String(data.currency||'');
 if(!name||name.length>80||businessName.length>80)throw Error(L('Enter your name and keep names under 80 characters.'));
 if(!countryCodes.includes(country))throw Error(L('Choose your country.'));
 if(!Object.hasOwn(currencies,currency))throw Error(L('Choose your currency.'));
 if(currency!==(s.settings.currency||'USD')&&currencyLocked(s))throw Error(L('Currency cannot change after prices or financial records have been added.'));
 s.settings={...s.settings,name,businessName,business:businessName||name,country,currency,onboarding:{...s.settings.onboarding,completedAt:undefined,version:1,step:'vertical',startedAt:s.settings.onboarding?.startedAt||new Date().toISOString()}};
 return s.settings;
}
export function chooseVertical(s,vertical){if(!Object.hasOwn(verticals,vertical))throw Error(L('Choose your business type.'));s.settings.vertical=vertical;s.settings.onboarding={...s.settings.onboarding,completedAt:undefined,version:1,step:'setup'};}
export function completeOnboarding(s){if(!s.settings.country||!s.settings.name||!s.settings.currency||!Object.hasOwn(verticals,s.settings.vertical))throw Error(L('Complete your profile and business type first.'));s.settings.onboarding={...s.settings.onboarding,version:1,step:'complete',completedAt:s.settings.onboarding?.completedAt||new Date().toISOString()};}
export function addStarterService(s,key){const preset=starterServices(s.settings.vertical||'general').find(x=>x.starterKey===key);if(!preset)throw Error(L('Choose a suggested service for your business.'));const existing=s.services.find(x=>x.starterKey===key||x.name.toLowerCase()===preset.name.toLowerCase());if(existing)return existing;const result=saveService(s,preset);result.starterKey=key;return result;}
// Workflow suggestions. Each acts on future events only and never sends anything: emails are drafts for review.
// `name` is what gets saved on the workflow (English); `label` and `description` are shown in the current language.
const flowTemplates={
 'proposal-contract':{icon:'signature',name:'Prepare the contract',label:L('Prepare the contract'),description:L('When a proposal is accepted, draft the contract for your review.'),trigger:'proposal.accepted',action:'contract.create',config:{title:'Agreement with {{client.name}}',body:'Following the accepted proposal “{{document.title}}”, here are the terms of our work together.'}},
 'contract-start':{icon:'projects',name:'Start projects on signature',label:L('Start projects on signature'),description:L('When a contract is signed, move the project to In progress.'),trigger:'contract.signed',action:'project.status',config:{status:'active'}},
 'paid-thanks':{icon:'invoices',name:'Thank clients for paying',label:L('Thank clients for paying'),description:L('When an invoice is paid in full, draft a thank-you email for review.'),trigger:'invoice.paid',action:'emailDraft.create',config:{subject:'Thank you for your payment',body:'Hi {{client.contact}},\n\nThank you for paying invoice {{invoice.number}}. It’s a pleasure working with you.'}},
 'project-review':{icon:'sparkles',name:'Ask for a testimonial',label:L('Ask for a testimonial'),description:L('When a project is completed, draft an email asking for a few words about it.'),trigger:'project.status_changed',filter:{value:'completed'},action:'emailDraft.create',config:{subject:'How did {{project.name}} go?',body:'Hi {{client.contact}},\n\nNow that {{project.name}} is complete, would you share a few words about working together? It helps a lot.'}},
 'meeting-followup':{icon:'scheduling',name:'Prepare a meeting follow-up',label:L('Prepare a meeting follow-up'),description:L('When you mark a meeting complete, prepare a proposal and email draft for review.'),trigger:'meeting.completed',action:'meeting.followup',config:{}},
 'inquiry':{icon:'forms',name:'Keep inquiries together',label:L('Keep inquiries together'),description:L('When a form is submitted, tag the linked client “Inquiry”.'),trigger:'submission.created',action:'client.add_tag',config:{tag:'Inquiry'}},
 'new-client':{icon:'clients',name:'Keep new clients organized',label:L('Keep new clients organized'),description:L('When a client is added, tag them “New client”.'),trigger:'client.created',action:'client.add_tag',config:{tag:'New client'}},
 'declined-feedback':{icon:'documents',name:'Learn from a declined proposal',label:L('Learn from a declined proposal'),description:L('When a proposal is declined, draft a short email asking what would have helped.'),trigger:'proposal.declined',action:'emailDraft.create',config:{subject:'Thanks for considering us',body:'Hi {{client.contact}},\n\nThanks for considering our proposal. If you have a moment, what would have made it a better fit?'}},
 'project-note':{icon:'projects',name:'Record new projects',label:L('Record new projects'),description:L('When a project is created, add its name to the client’s internal notes.'),trigger:'project.created',action:'client.note',config:{body:'Project started: {{project.name}}.'}},
};
// Six per business type; the first three are on by default because they fit how that business works.
const project=['proposal-contract','contract-start','paid-thanks','project-review','new-client','inquiry'];
const flowPicks={design:project,web:project,product:project,marketing:project,writing:project,video:project,audio:project,architecture:project,translation:['proposal-contract','paid-thanks','new-client','project-review','inquiry','contract-start'],
 photography:['inquiry','proposal-contract','paid-thanks','project-review','meeting-followup','new-client'],
 consulting:['meeting-followup','proposal-contract','paid-thanks','declined-feedback','contract-start','new-client'],
 coaching:['meeting-followup','inquiry','paid-thanks','new-client','project-review','project-note'],
 training:['meeting-followup','inquiry','paid-thanks','new-client','project-review','project-note'],
 finance:['new-client','proposal-contract','paid-thanks','meeting-followup','inquiry','contract-start'],
 legal:['new-client','proposal-contract','paid-thanks','meeting-followup','inquiry','contract-start'],
 general:['new-client','proposal-contract','paid-thanks','meeting-followup','inquiry','project-review']};
// Services step: the business type's suggestions merged with what is already saved (so Back and a reload
// show what was kept), then the person's own services. Each row is editable: name, pricing unit and price.
export function onboardingServiceRows(s,vertical='general'){
 const saved=(s.services||[]).filter(x=>x.kind==='service'&&!x.archived),used=new Set();
 const fromService=(x,starterKey=x.starterKey||'')=>({key:x.id,id:x.id,starterKey,name:x.name,unit:pricingBasis(x).unit,rate:x.items[0]?.rate||0,on:true});
 const rows=starterServices(vertical).filter(x=>x.kind==='service').map((p,i)=>{const x=saved.find(x=>x.starterKey===p.starterKey);if(x){used.add(x.id);return fromService(x,p.starterKey);}return {key:p.starterKey,id:'',starterKey:p.starterKey,name:p.name,unit:p.unit||'item',rate:p.items[0].rate,on:!saved.length&&i<3};});
 return [...rows,...saved.filter(x=>!used.has(x.id)).reverse().map(x=>fromService(x))];
}
// Saves ticked rows (creating, renaming or repricing) and archives saved ones that were unticked.
// Rows get their service id back, so saving again updates instead of duplicating. Returns how many are kept.
export function saveOnboardingServices(s,rows){
 const kept=rows.filter(r=>r.on);
 for(const r of kept){const name=String(r.name||'').trim();
  if(!name)throw Error(L('Name each service you keep, or untick it.'));
  if(name.length>100)throw Error(L('Keep service names under 100 characters.'));
  if(!Object.hasOwn(rateUnits,r.unit))throw Error(L('Choose how each service is priced.'));
  if(!Number.isSafeInteger(r.rate)||r.rate<1||r.rate>100000000)throw Error(L('Enter a price for {name}.',{name}));}
 for(const r of rows){
  const existing=(s.services||[]).find(x=>r.id?x.id===r.id:!!r.starterKey&&x.starterKey===r.starterKey);
  if(!r.on){if(existing)existing.archived=true;continue;}
  const name=r.name.trim(),basis={billingModel:r.unit==='item'?'fixed':'time',unit:r.unit};
  if(existing){
   const item=existing.items[0]||{quantity:1};
   if(existing.archived||existing.name!==name||item.rate!==r.rate||pricingBasis(existing).unit!==r.unit)saveService(s,{...existing,...basis,name,items:[{...item,description:!item.description||item.description===existing.name?name:item.description,rate:r.rate}]},existing.id);
   existing.archived=false;r.id=existing.id;continue;
  }
  const preset=r.starterKey?starterServices(s.settings.vertical||'general').find(x=>x.starterKey===r.starterKey):null;
  const svc=saveService(s,{...(preset||{kind:'service'}),...basis,name,items:[{...(preset?.items[0]||{quantity:1}),description:name,rate:r.rate}]});
  if(preset)svc.starterKey=r.starterKey;r.id=svc.id;
 }
 return kept.length;
}
export function recommendedWorkflows(vertical='general'){
 return (flowPicks[vertical]||flowPicks.general).map((key,i)=>({key,...flowTemplates[key],on:i<3}));
}
export function starterWorkflow(s,key){return s.automation?.workflows?.find(w=>w.starterKey===key);}
export function enableStarterWorkflow(s,key){const p=recommendedWorkflows(s.settings.vertical).find(x=>x.key===key);if(!p)throw Error(L('Choose a suggested workflow.'));const existing=starterWorkflow(s,key);if(existing){existing.enabled=true;return existing;}const w=saveWorkflow(s,{name:p.name,enabled:true,triggers:[{type:p.trigger,filter:{...p.filter}}],steps:[{type:p.action,targetId:'related',config:p.config}]});w.starterKey=key;return w;}
export function validateOnboarding(s){const o=s.settings.onboarding;if(!o)return;if(o.version!==1||!['profile','vertical','setup','complete'].includes(o.step))throw Error(L('Invalid onboarding progress.'));if(s.settings.country&&!countryCodes.includes(s.settings.country))throw Error(L('Choose a valid country.'));if(o.step!=='profile'&&(!s.settings.name.trim()||s.settings.name.length>80||!s.settings.country||!Object.hasOwn(currencies,s.settings.currency)))throw Error(L('Complete your profile first.'));if(['setup','complete'].includes(o.step)&&!Object.hasOwn(verticals,s.settings.vertical))throw Error(L('Choose your business type.'));if(o.completedAt&&(!Number.isFinite(Date.parse(o.completedAt))||o.step!=='complete'))throw Error(L('Invalid onboarding completion.'));}
