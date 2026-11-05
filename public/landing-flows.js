// Landing page workflow builder: trigger and action pairs, with illustrative results on fictional records.
// Every pair below is valid in Thrive's workflow catalog (tests/beta-launch.test.mjs checks them).
export const flows={
 'submission.created':{label:'Form submitted',name:'Tag new inquiries',record:'the Northstar Labs inquiry',actions:[['client.add_tag','Add client tag “New inquiry”','Northstar Labs would be tagged “New inquiry”.'],['emailDraft.create','Draft email','A welcome email draft for Priya Shah would be saved for you to review.']]},
 'proposal.accepted':{label:'Proposal accepted',name:'Paperwork on acceptance',record:'Juniper brand identity',actions:[['contract.create','Create contract draft','A contract draft for Juniper Studio would be created.'],['invoice.deposit','Create deposit invoice','A €3,000.00 deposit invoice for Juniper Studio would be created.']]},
 'contract.signed':{label:'Contract signed',name:'Deposit on signature',record:'Brand identity agreement',actions:[['invoice.deposit','Create deposit invoice','A €3,000.00 deposit invoice for Juniper Studio would be created.'],['project.status','Change project status','Juniper brand identity would move to In progress.']]},
 'invoice.paid':{label:'Invoice fully paid',name:'Thank clients who pay',record:'INV-006 · Orbit',actions:[['client.add_tag','Add client tag “Paid”','Orbit would be tagged “Paid”.'],['emailDraft.create','Draft email','A thank-you email draft for James Wilson would be saved for you to review.']]},
 'meeting.completed':{label:'Meeting completed',name:'Follow up after calls',record:'Discovery call · Northstar Labs',actions:[['meeting.followup','Draft meeting follow-up','A proposal draft and a follow-up email for Priya Shah would be saved for review.']]},
};
