import {L} from './i18n.js';
// State-specific actions used by both table rows and board cards.
export function documentRecordActions(state,entity,row){
 const record=row.raw||row;
 if(entity==='clients')return {items:[[L('Open client'),'client','clients'],[L('Edit client'),'edit-client','edit'],[record.archived?L('Restore'):L('Archive'),'archive-client','documents']]};
 if(entity==='projects')return {items:[[L('Open project'),'project','projects'],[L('Edit project'),'edit-project','edit'],[record.archived?L('Restore'):L('Archive'),'archive-project','documents']]};
 if(entity==='invoices'){
  return row.status==='draft'
   ?{items:[[L('Edit draft'),'edit-invoice-draft','edit'],[L('Delete draft'),'delete-invoice-draft','close','destructive']]}
   :{items:[[L('View invoice'),'invoice','invoices']],note:L('Issued invoices are locked. Their amounts, design, and payment history cannot be edited or deleted.')};
 }
 const d=row.raw,p=state.projects.find(p=>p.id===d.projectId),locked=p?.archived||p?.status==='cancelled';
 if(d.archived)return {items:[[L('View document'),'document','documents'],[L('Restore'),'doc-archive','arrow'],...(!d.versions.length&&d.status==='draft'?[[L('Delete draft'),'doc-delete','close','destructive']]:[])]};
 const items=[];
 if(d.status==='draft'&&!locked)items.push([L('Edit draft'),'doc-edit','edit']);
 else items.push([L('View document'),'document','documents']);
 if(!locked&&!['draft','accepted','signed'].includes(d.status))items.push([L('Create revision'),'doc-revise-request','edit']);
 if(d.status==='draft'&&!d.versions.length)items.push([L('Delete draft'),'doc-delete','close','destructive']);
 else items.push([L('Archive'),'doc-archive','documents']);
 return {items,note:locked?L('This project is closed. Reopen it to edit the document.'):['accepted','signed'].includes(d.status)?L('Completed agreements are locked. Archive to remove this document from the active list.'):d.versions.length?L('Published versions are kept in history. Use a revision to make changes.'):''};
}
