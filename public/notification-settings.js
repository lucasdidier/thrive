// Email notifications to the workspace owner. Instant emails cover client actions;
// the summary covers everything that needs attention. Shared by UI, validation and server.
import {L} from './i18n.js';
export const instantNotifications=[
 ['formResponse',L('New form response'),'forms'],
 ['documentAccepted',L('Proposal accepted or contract signed'),'signature'],
 ['documentDeclined',L('Proposal or contract declined'),'documents'],
];
export const summarySections=[
 ['meetings',L('Upcoming meetings'),'calendar'],
 ['overdueInvoices',L('Overdue invoices'),'invoices'],
 ['awaitingResponse',L('Waiting on clients'),'documents'],
 ['projectsDue',L('Projects due soon'),'projects'],
 ['unbilledTime',L('Unbilled time'),'time'],
 ['emailReplies',L('Emails to reply to'),'mail'],
 ['newResponses',L('New form responses'),'forms'],
];
export const summaryFrequencies=[['daily',L('Daily')],['weekly',L('Weekly')],['off',L('Off')]];

export function notificationSettings(s){
 const saved=s.settings?.notifications||{},instant=saved.instant||{},sections=saved.sections||{};
 return {
  instant:Object.fromEntries(instantNotifications.map(([key])=>[key,key==='formResponse'&&instant[key]===undefined?s.settings?.formEmailNotifications!==false:instant[key]!==false])),
  summary:summaryFrequencies.some(([v])=>v===saved.summary)?saved.summary:'daily',
  sections:Object.fromEntries(summarySections.map(([key])=>[key,sections[key]!==false])),
 };
}
export function validateNotificationSettings(n){
 if(!n||typeof n!=='object'||Array.isArray(n))throw Error(L('Invalid notification settings.'));
 const bools=(value,keys)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k))||Object.values(value).some(v=>typeof v!=='boolean'))throw Error(L('Invalid notification settings.'));};
 bools(n.instant,instantNotifications.map(([k])=>k));bools(n.sections,summarySections.map(([k])=>k));
 if(!summaryFrequencies.some(([v])=>v===n.summary))throw Error(L('Invalid summary frequency.'));
 return n;
}
