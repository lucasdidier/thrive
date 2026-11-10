import {L} from './i18n.js';
export const homeWidgets=[['totals',L('Business totals'),'money'],['calendar',L('Calendar'),'calendar'],['projects',L('Open projects'),'projects'],['awaiting',L('Awaiting a response'),'documents'],['invoices',L('Outstanding invoices'),'invoices'],['activity',L('Recent activity'),'clock']];
export function homeWidgetPreferences(value){return Object.fromEntries(homeWidgets.map(([id])=>[id,(value?.[id]??(['invoices','awaiting'].includes(id)?value?.followup:undefined))!==false]));}
