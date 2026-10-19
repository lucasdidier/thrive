import {currencies,currencyLocked} from './currency.js';
import {verticals,starterServices} from './catalog-starters.js';
import {saveService} from './services-domain.js';
import {saveWorkflow} from './workflow-domain.js';
export const countryCodes='AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const countryNames=new Intl.DisplayNames(['en'],{type:'region'});
export const countries=countryCodes.map(code=>[code,countryNames.of(code)]).sort((a,b)=>a[1].localeCompare(b[1]));
export const suggestedCurrency=country=>({US:'USD',GB:'GBP',CA:'CAD',AU:'AUD',NZ:'NZD',CH:'CHF',SE:'SEK',NO:'NOK',DK:'DKK',PL:'PLN',BR:'BRL',IN:'INR',SG:'SGD',HK:'HKD',ZA:'ZAR',MX:'MXN'}[country]||('AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK'.split(' ').includes(country)?'EUR':null));
export const needsOnboarding=s=>!!s.settings.onboarding&&!s.settings.onboarding.completedAt;
export function saveOnboardingProfile(s,data){
 const name=String(data.name||'').trim(),businessName=String(data.businessName||'').trim(),country=String(data.country||''),currency=String(data.currency||'');
 if(!name||name.length>80||businessName.length>80)throw Error('Enter your name and keep names under 80 characters.');
 if(!countryCodes.includes(country))throw Error('Choose your country.');
 if(!Object.hasOwn(currencies,currency))throw Error('Choose your currency.');
 if(currency!==(s.settings.currency||'USD')&&currencyLocked(s))throw Error('Currency cannot change after prices or financial records have been added.');
 s.settings={...s.settings,name,businessName,business:businessName||name,country,currency,onboarding:{...s.settings.onboarding,completedAt:undefined,version:1,step:'vertical',startedAt:s.settings.onboarding?.startedAt||new Date().toISOString()}};
 return s.settings;
}
export function chooseVertical(s,vertical){if(!Object.hasOwn(verticals,vertical))throw Error('Choose your business type.');s.settings.vertical=vertical;s.settings.onboarding={...s.settings.onboarding,completedAt:undefined,version:1,step:'setup'};}
export function completeOnboarding(s){if(!s.settings.country||!s.settings.name||!s.settings.currency||!Object.hasOwn(verticals,s.settings.vertical))throw Error('Complete your profile and business type first.');s.settings.onboarding={...s.settings.onboarding,version:1,step:'complete',completedAt:s.settings.onboarding?.completedAt||new Date().toISOString()};}
export function addStarterService(s,key){const preset=starterServices(s.settings.vertical||'general').find(x=>x.starterKey===key);if(!preset)throw Error('Choose a suggested service for your business.');const existing=s.services.find(x=>x.starterKey===key||x.name.toLowerCase()===preset.name.toLowerCase());if(existing)return existing;const result=saveService(s,preset);result.starterKey=key;return result;}
export function recommendedWorkflows(vertical='general'){
 const followup=['consulting','photography','design','general'].includes(vertical);
 const items=[
 {key:'new-client',name:'Keep new clients organized',description:'When a client is added, tag them “New client”.',trigger:'client.created',action:'client.add_tag',config:{tag:'New client'}},
 {key:'inquiry',name:'Keep inquiries together',description:'When a form is submitted, tag the linked client “Inquiry”.',trigger:'submission.created',action:'client.add_tag',config:{tag:'Inquiry'}},
 {key:'meeting-followup',name:'Prepare a meeting follow-up',description:'When you mark a meeting complete, prepare a proposal and email draft for review.',trigger:'meeting.completed',action:'meeting.followup',config:{}},
 {key:'project-note',name:'Record new projects',description:'When a project is created, add its name to the client’s internal notes.',trigger:'project.created',action:'client.note',config:{body:'Project started: {{project.name}}.'}}
 ];return followup?[items[0],items[2],items[1]]:[items[0],items[3],items[1]];
}
export function starterWorkflow(s,key){return s.automation?.workflows?.find(w=>w.starterKey===key);}
export function enableStarterWorkflow(s,key){const p=recommendedWorkflows(s.settings.vertical).find(x=>x.key===key);if(!p)throw Error('Choose a suggested workflow.');const existing=starterWorkflow(s,key);if(existing){existing.enabled=true;return existing;}const w=saveWorkflow(s,{name:p.name,enabled:true,triggers:[{type:p.trigger,filter:{}}],steps:[{type:p.action,targetId:'related',config:p.config}]});w.starterKey=key;return w;}
export function validateOnboarding(s){const o=s.settings.onboarding;if(!o)return;if(o.version!==1||!['profile','vertical','setup','complete'].includes(o.step))throw Error('Invalid onboarding progress.');if(s.settings.country&&!countryCodes.includes(s.settings.country))throw Error('Choose a valid country.');if(o.step!=='profile'&&(!s.settings.name.trim()||s.settings.name.length>80||!s.settings.country||!Object.hasOwn(currencies,s.settings.currency)))throw Error('Complete your profile first.');if(['setup','complete'].includes(o.step)&&!Object.hasOwn(verticals,s.settings.vertical))throw Error('Choose your business type.');if(o.completedAt&&(!Number.isFinite(Date.parse(o.completedAt))||o.step!=='complete'))throw Error('Invalid onboarding completion.');}
