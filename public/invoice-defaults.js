import {L} from './i18n.js';
export function invoiceDefaults(s){return {dueDays:14,taxRate:0,...s.settings?.invoiceDefaults};}
export function validateInvoiceDefaults(value){const dueDays=Number(value.dueDays),taxRate=Number(value.taxRate);if(!Number.isInteger(dueDays)||dueDays<0||dueDays>365||!Number.isFinite(taxRate)||taxRate<0||taxRate>100||Math.abs(taxRate*100-Math.round(taxRate*100))>0.00001)throw Error(L('Use 0–365 payment days and a tax percentage with up to two decimals.'));return {dueDays,taxRate};}
