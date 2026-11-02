export function recordSearchFields(state,type,record){
 const project=state.projects?.find(p=>p.id===record.projectId);
 const client=state.clients?.find(c=>c.id===(record.clientId||project?.clientId));
 const title=record.name||record.title||record.number||'Untitled';
 const number=type==='invoices'?record.number:'';
 const day=record.updatedAt?.slice(0,10)||record.createdAt?.slice(0,10);
 const status=record.status&&(type==='projects'&&state.settings?.projectStatuses?.find(x=>x.id===record.status)?.name||String(record.status).replace(/[_-]+/g,' ').replace(/^\w/,c=>c.toUpperCase()));
 const date=day&&!Number.isNaN(Date.parse(day+'T12:00:00Z'))?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z')):'';
 const context=[client?.name||record.clientName,project?.name||record.projectName,status,date].filter(Boolean);
 return {
  label:number?`${number} · ${title===number?'Invoice':title}`:title,
  description:context.join(' · '),
  keywords:[record.number,record.name,record.title,record.email,record.status,day,...context].filter(Boolean),
 };
}
