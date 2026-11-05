// Email notifications to the workspace owner. Instant emails cover client actions;
// the summary covers everything that needs attention. Shared by UI, validation and server.
export const instantNotifications=[
 ['formResponse','New form response','forms'],
 ['documentAccepted','Proposal accepted or contract signed','signature'],
 ['documentDeclined','Proposal or contract declined','documents'],
];
export const summarySections=[
 ['meetings','Upcoming meetings','calendar'],
 ['overdueInvoices','Overdue invoices','invoices'],
 ['awaitingResponse','Waiting on clients','documents'],
 ['projectsDue','Projects due soon','projects'],
 ['unbilledTime','Unbilled time','time'],
 ['emailReplies','Emails to reply to','mail'],
 ['newResponses','New form responses','forms'],
];
export const summaryFrequencies=[['daily','Daily'],['weekly','Weekly'],['off','Off']];

export function notificationSettings(s){
 const saved=s.settings?.notifications||{},instant=saved.instant||{},sections=saved.sections||{};
 return {
  instant:Object.fromEntries(instantNotifications.map(([key])=>[key,key==='formResponse'&&instant[key]===undefined?s.settings?.formEmailNotifications!==false:instant[key]!==false])),
  summary:summaryFrequencies.some(([v])=>v===saved.summary)?saved.summary:'daily',
  sections:Object.fromEntries(summarySections.map(([key])=>[key,sections[key]!==false])),
 };
}
export function validateNotificationSettings(n){
 if(!n||typeof n!=='object'||Array.isArray(n))throw Error('Invalid notification settings.');
 const bools=(value,keys)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k))||Object.values(value).some(v=>typeof v!=='boolean'))throw Error('Invalid notification settings.');};
 bools(n.instant,instantNotifications.map(([k])=>k));bools(n.sections,summarySections.map(([k])=>k));
 if(!summaryFrequencies.some(([v])=>v===n.summary))throw Error('Invalid summary frequency.');
 return n;
}
