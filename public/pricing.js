import {L} from './i18n.js';
export const rateUnits={item:L('Fixed fee'),hour:L('Hourly'),day:L('Daily'),week:L('Weekly'),month:L('Monthly')};
const perUnit={hour:L('/ hour'),day:L('/ day'),week:L('/ week'),month:L('/ month')};
const unitQuantity={item:L('Quantity'),hour:L('Hours'),day:L('Days'),week:L('Weeks'),month:L('Months')};
// Lower-case unit after a number ("3 hours"); a separate key so languages that capitalize nouns can.
const unitQuantityLower={item:L('quantity'),hour:L('hours'),day:L('days'),week:L('weeks'),month:L('months')};
export function pricingBasis(input={}){const billingModel=input.billingModel||'fixed',unit=input.unit||(billingModel==='time'?'hour':'item');if(!['fixed','time'].includes(billingModel)||!Object.hasOwn(rateUnits,unit)||billingModel==='fixed'&&unit!=='item'||billingModel==='time'&&unit==='item')throw Error(L('Choose fixed fee or a time-based rate.'));return {billingModel,unit};}
export const rateSuffix=x=>pricingBasis(x).unit==='item'?L('fixed fee'):perUnit[pricingBasis(x).unit];
export const quantityLabel=x=>unitQuantity[pricingBasis(x).unit];
export const quantityUnit=x=>unitQuantityLower[pricingBasis(x).unit];
export const validQuantity=n=>Number.isFinite(n)&&n>0&&n<=10000&&Math.abs(n*100-Math.round(n*100))<0.00001;
export const hasTimePricing=offers=>offers.some(o=>o.packageItems?hasTimePricing(o.packageItems):pricingBasis(o).billingModel==='time');
