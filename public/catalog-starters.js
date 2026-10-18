import {saveService} from './services-domain.js';
export const verticals={design:'Design & branding',web:'Web & development',consulting:'Consulting',marketing:'Marketing & content',photography:'Photography & video',general:'Other services'};
const presets={
 design:[['Brand discovery','fixed','item',750],['Brand identity','fixed','item',2500],['Design support','time','hour',100],['Creative direction','time','day',600]],
 web:[['Website audit','fixed','item',500],['Website build','fixed','item',3500],['Development','time','hour',100],['Maintenance','time','month',250]],
 consulting:[['Strategy session','fixed','item',300],['Consulting','time','hour',150],['Workshop','time','day',1200],['Advisory support','time','month',1500]],
 marketing:[['Content strategy','fixed','item',1000],['Copywriting','time','hour',90],['Campaign support','time','week',800],['Content management','time','month',1200]],
 photography:[['Portrait session','fixed','item',350],['Production','time','day',1000],['Editing','time','hour',80],['Content production','time','month',1800]],
 general:[['Discovery session','fixed','item',150],['Project work','fixed','item',1000],['Professional services','time','hour',100],['Ongoing support','time','month',500]]
};
export function inferVertical(description=''){return /web|develop|software/i.test(description)?'web':/consult|strateg|advis/i.test(description)?'consulting':/market|content|copywrit/i.test(description)?'marketing':/photo|video|film/i.test(description)?'photography':/design|brand|creative/i.test(description)?'design':'general';}
export function starterServices(vertical){if(!verticals[vertical])throw Error('Choose your business type.');const services=presets[vertical].map(([name,billingModel,unit,usd],i)=>({starterKey:`${vertical}:${i}`,name,kind:'service',billingModel,unit,items:[{description:name,quantity:1,rate:usd*100}]}));const fixed=services.filter(x=>x.billingModel==='fixed');services.push({starterKey:`${vertical}:package`,name:'Starter package',kind:'package',billingModel:'fixed',unit:'item',items:fixed.map(x=>({...x.items[0]}))});return services;}
export function populateCatalog(s,vertical){const proposed=starterServices(vertical),next=structuredClone(s),added=[];for(const x of proposed){if(next.services?.some(r=>r.starterKey===x.starterKey||r.name.toLowerCase()===x.name.toLowerCase()))continue;const r=saveService(next,x);r.starterKey=x.starterKey;added.push(r.id);}next.settings.vertical=vertical;Object.assign(s,next);return added;}
