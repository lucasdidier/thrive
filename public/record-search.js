export function recordSearchFields(state,type,record){
 const project=state.projects?.find(p=>p.id===record.projectId);
 const client=state.clients?.find(c=>c.id===(record.clientId||project?.clientId));
 const title=record.name||record.title||record.number||'Untitled';
 const number=type==='invoices'?record.number:'';
 const context=[client?.name||record.clientName,project?.name||record.projectName,record.status,record.updatedAt?.slice(0,10)||record.createdAt?.slice(0,10)].filter(Boolean);
 return {
  label:number?`${number} · ${title===number?'Invoice':title}`:title,
  description:context.join(' · '),
  keywords:[record.number,record.name,record.title,record.email,...context].filter(Boolean),
 };
}
