// State-specific actions used by both table rows and board cards.
export function documentRecordActions(state,entity,row){
 if(entity==='invoices'){
  return row.status==='draft'
   ?{items:[['Edit draft','edit-invoice-draft','edit'],['Delete draft','delete-invoice-draft','close','destructive']]}
   :{items:[['View invoice','invoice','invoices']],note:'Issued invoices are locked. Their amounts, design, and payment history cannot be edited or deleted.'};
 }
 const d=row.raw,p=state.projects.find(p=>p.id===d.projectId),locked=p?.archived||p?.status==='cancelled';
 if(d.archived)return {items:[['View document','document','documents'],['Restore','doc-archive','arrow'],...(!d.versions.length&&d.status==='draft'?[['Delete draft','doc-delete','close','destructive']]:[])]};
 const items=[];
 if(d.status==='draft'&&!locked)items.push(['Edit draft','doc-edit','edit']);
 else items.push(['View document','document','documents']);
 if(!locked&&!['draft','accepted','signed'].includes(d.status))items.push(['Create revision','doc-revise-request','edit']);
 if(d.status==='draft'&&!d.versions.length)items.push(['Delete draft','doc-delete','close','destructive']);
 else items.push(['Archive','doc-archive','documents']);
 return {items,note:locked?'This project is closed. Reopen it to edit the document.':['accepted','signed'].includes(d.status)?'Completed agreements are locked. Archive to remove this document from the active list.':d.versions.length?'Published versions are kept in history. Use a revision to make changes.':''};
}
