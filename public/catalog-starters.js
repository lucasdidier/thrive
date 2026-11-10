import {saveService} from './services-domain.js';
import {L} from './i18n.js';
// Business types: ordered by how common they are among independent service businesses. Keys are stored; keep them stable.
// Labels are display text (translated); only the keys are stored.
export const verticals={design:L('Design & branding'),web:L('Web & software development'),product:L('Product & UX design'),marketing:L('Marketing & social media'),writing:L('Writing & copywriting'),photography:L('Photography'),video:L('Video & animation'),consulting:L('Consulting & strategy'),coaching:L('Coaching'),training:L('Training & education'),finance:L('Bookkeeping & finance'),legal:L('Legal services'),architecture:L('Architecture & interiors'),audio:L('Music & audio'),translation:L('Translation'),general:L('Other')};
export const verticalIcons={design:'palette',web:'code',product:'monitor',marketing:'megaphone',writing:'pencil',photography:'camera',video:'film',consulting:'lightbulb',coaching:'target',training:'graduation',finance:'calculator',legal:'scales',architecture:'building',audio:'headphones',translation:'translate',general:'briefcase'};
const presets={
 design:[['Brand discovery','fixed','item',750],['Brand identity','fixed','item',2500],['Design support','time','hour',100],['Creative direction','time','day',600]],
 web:[['Website audit','fixed','item',500],['Website build','fixed','item',3500],['Development','time','hour',100],['Maintenance','time','month',250]],
 consulting:[['Strategy session','fixed','item',300],['Consulting','time','hour',150],['Workshop','time','day',1200],['Advisory support','time','month',1500]],
 marketing:[['Content strategy','fixed','item',1000],['Copywriting','time','hour',90],['Campaign support','time','week',800],['Content management','time','month',1200]],
 photography:[['Portrait session','fixed','item',350],['Event coverage','time','day',1000],['Photo editing','time','hour',80],['Content shoot','fixed','item',900]],
 video:[['Video production','time','day',1200],['Video editing','time','hour',90],['Motion graphics','fixed','item',1500],['Monthly content','time','month',2000]],
 product:[['UX audit','fixed','item',1200],['Product design','time','hour',110],['Design sprint','time','week',4000],['Design retainer','time','month',3000]],
 writing:[['Copywriting','time','hour',80],['Website copy','fixed','item',1200],['Blog article','fixed','item',300],['Editing','time','hour',70]],
 coaching:[['Discovery call','fixed','item',100],['Coaching session','time','hour',150],['Coaching package','fixed','item',1200],['Monthly coaching','time','month',600]],
 training:[['Workshop','time','day',1500],['Training session','time','hour',150],['Course design','fixed','item',2500],['Mentoring','time','month',800]],
 finance:[['Bookkeeping','time','month',400],['Tax return','fixed','item',600],['Financial review','fixed','item',800],['Advisory','time','hour',120]],
 legal:[['Consultation','time','hour',200],['Contract review','fixed','item',500],['Document drafting','fixed','item',900],['Legal retainer','time','month',1500]],
 architecture:[['Site visit','fixed','item',300],['Concept design','fixed','item',3000],['Design development','time','hour',110],['Project management','time','month',2000]],
 audio:[['Mixing','fixed','item',400],['Recording session','time','hour',90],['Sound design','fixed','item',1200],['Production day','time','day',800]],
 translation:[['Translation','time','hour',60],['Document translation','fixed','item',250],['Proofreading','time','hour',50],['Localization','fixed','item',1500]],
 general:[['Discovery session','fixed','item',150],['Project work','fixed','item',1000],['Professional services','time','hour',100],['Ongoing support','time','month',500]]
};
export function inferVertical(description=''){const rules=[['product',/\bux\b|\bui\b|product design/i],['web',/web|develop|software|engineer/i],['consulting',/consult|strateg|advis/i],['marketing',/market|social|seo|ads\b/i],['writing',/writ|copy|content|editor/i],['video',/video|film|motion|animat/i],['photography',/photo/i],['coaching',/coach/i],['training',/train|teach|tutor|course/i],['finance',/bookkeep|account|financ|tax/i],['legal',/legal|lawyer|attorney/i],['architecture',/architect|interior/i],['audio',/music|audio|sound|podcast/i],['translation',/translat|locali/i],['design',/design|brand|creative/i]];return rules.find(([,r])=>r.test(description))?.[0]||'general';}
export function starterServices(vertical){if(!verticals[vertical])throw Error(L('Choose your business type.'));const services=presets[vertical].map(([name,billingModel,unit,usd],i)=>({starterKey:`${vertical}:${i}`,name,kind:'service',billingModel,unit,items:[{description:name,quantity:1,rate:usd*100}]}));const fixed=services.filter(x=>x.billingModel==='fixed');services.push({starterKey:`${vertical}:package`,name:'Starter package',kind:'package',billingModel:'fixed',unit:'item',items:fixed.map(x=>({...x.items[0]}))});return services;}
export function populateCatalog(s,vertical){const proposed=starterServices(vertical),next=structuredClone(s),added=[];for(const x of proposed){if(next.services?.some(r=>r.starterKey===x.starterKey||r.name.toLowerCase()===x.name.toLowerCase()))continue;const r=saveService(next,x);r.starterKey=x.starterKey;added.push(r.id);}next.settings.vertical=vertical;Object.assign(s,next);return added;}
