import {L,language} from './i18n.js';
// Display names for stored statuses; anything else is shown as the stored value in sentence case.
const statusLabels={draft:L('Draft'),issued:L('Issued'),sent:L('Sent'),viewed:L('Viewed'),paid:L('Paid'),partial:L('Partially paid'),overdue:L('Overdue'),void:L('Void'),accepted:L('Accepted'),signed:L('Signed'),declined:L('Declined'),active:L('Active'),planned:L('Planned'),completed:L('Completed'),cancelled:L('Cancelled'),archived:L('Archived'),published:L('Published'),scheduled:L('Scheduled'),unpaid:L('Unpaid')};
export function recordSearchFields(state,type,record){
 const project=state.projects?.find(p=>p.id===record.projectId);
 const client=state.clients?.find(c=>c.id===(record.clientId||project?.clientId));
 const title=record.name||record.title||record.number||L('Untitled');
 const number=type==='invoices'?record.number:'';
 const day=record.updatedAt?.slice(0,10)||record.createdAt?.slice(0,10);
 const status=record.status&&(type==='projects'&&state.settings?.projectStatuses?.find(x=>x.id===record.status)?.name||statusLabels[record.status]||String(record.status).replace(/[_-]+/g,' ').replace(/^\w/,c=>c.toUpperCase()));
 const date=day&&!Number.isNaN(Date.parse(day+'T12:00:00Z'))?new Intl.DateTimeFormat(language(),{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z')):'';
 const context=[client?.name||record.clientName,project?.name||record.projectName,status,date].filter(Boolean);
 return {
  label:number?`${number} · ${title===number?L('Invoice'):title}`:title,
  description:context.join(' · '),
  keywords:[record.number,record.name,record.title,record.email,record.status,day,...context].filter(Boolean),
 };
}
