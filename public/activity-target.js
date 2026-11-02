// Historical events may contain a name only. Never pick arbitrarily between
// duplicate names, and never open a deleted record.
export function activityTarget(state,event){
 if(event.threadId)return {action:'mail-project-thread',id:event.threadId};
 const rules=[
  ['documentId','documents','document','proposals',d=>d.title],
  ['clientId','clients','client','clients',d=>d.name],
  ['projectId','projects','project','projects',d=>d.name],
  ['invoiceId','invoices','invoice','invoices',d=>d.number],
  ['timeId','time','time-edit','time',d=>d.note],
 ];
 const text=event.text||'',kind=event.kind;
 if(/^Invoice draft\b/.test(text)&&!event.invoiceId){const matches=(state.invoiceDrafts||[]).filter(d=>d.title===event.detail);return matches.length===1?{action:'invoice',id:matches[0].id}:{action:'navigate',page:'invoices'};}
 if(/^Service\b/.test(text))return {action:'navigate',page:'settings/services'};
 let rule=rules.find(([key])=>event[key]);
 if(!rule){const key=/^Invoice\b/.test(text)||kind==='payment'?'invoiceId':/^Time\b/.test(text)||kind==='time'?'timeId':/^(Contract|Proposal|Document)\b/.test(text)||['document','proposal','contract','agreement'].includes(kind)?'documentId':/^Client\b/.test(text)||kind==='client'?'clientId':/^Project\b/.test(text)||kind==='project'?'projectId':kind==='time'?'timeId':null;rule=rules.find(([id])=>id===key);}
 if(rule){const [key,collection,action,page,name]=rule;const fallback=key==='documentId'&&(/^Contract\b/.test(text)||['contract','agreement'].includes(event.documentKind)||['contract','agreement'].includes(kind))?'contracts':page;const rows=(key==='invoiceId'?[...(state.invoices||[]),...(state.invoiceDrafts||[])]:state[collection]||[]).filter(r=>!r.archived);const matches=event[key]?rows.filter(r=>r.id===event[key]):rows.filter(r=>name(r)===event.detail||key==='invoiceId'&&r.number&&event.detail?.startsWith(r.number+' · ')||key==='documentId'&&r.versions?.some(v=>v.title===event.detail));if(matches.length===1)return {action,id:matches[0].id};return {action:'navigate',page:fallback};}
 return {action:'navigate',page:({mail:'messages',meeting:'scheduling',forms:'forms',settings:'settings',workflows:'workflows',note:'clients'})[kind]||'notifications'};
}
