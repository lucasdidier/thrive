export const rateUnits={item:'Fixed fee',hour:'Hourly',day:'Daily',week:'Weekly',month:'Monthly'};
export function pricingBasis(input={}){const billingModel=input.billingModel||'fixed',unit=input.unit||(billingModel==='time'?'hour':'item');if(!['fixed','time'].includes(billingModel)||!Object.hasOwn(rateUnits,unit)||billingModel==='fixed'&&unit!=='item'||billingModel==='time'&&unit==='item')throw Error('Choose fixed fee or a time-based rate.');return {billingModel,unit};}
export const rateSuffix=x=>pricingBasis(x).unit==='item'?'fixed fee':`/ ${pricingBasis(x).unit}`;
export const quantityLabel=x=>pricingBasis(x).unit==='item'?'Quantity':`${pricingBasis(x).unit[0].toUpperCase()+pricingBasis(x).unit.slice(1)}s`;
export const validQuantity=n=>Number.isFinite(n)&&n>0&&n<=10000&&Math.abs(n*100-Math.round(n*100))<0.00001;
export const hasTimePricing=offers=>offers.some(o=>pricingBasis(o).billingModel==='time');
