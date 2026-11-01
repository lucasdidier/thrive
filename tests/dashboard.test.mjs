import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardTotals,calendarWeek,eventsOnDay} from '../public/dashboard-domain.js';
import {emptyWorkspace} from '../server/account-workspace.mjs';
import {saveClient} from '../public/domain.js';
import {createDocument} from '../public/workspace-domain.js';
import {snapshotWorkspace,detectEvents,executeWorkspaceAction,saveWorkflow,runWorkflows} from '../public/workflow-domain.js';
import {crmRecords,schemaFor} from '../public/crm-domain.js';
test('dashboard counts only completed types and excludes archived time and projects',()=>{const s=emptyWorkspace({name:'Test'});s.projects=[{status:'completed'},{status:'active'},{status:'completed',archived:true}];s.time=[{minutes:90},{minutes:30,billable:false},{minutes:120,archived:true}];s.documents=[{kind:'proposal',status:'accepted'},{kind:'contract',status:'signed'},{kind:'proposal',status:'signed'},{kind:'agreement',status:'signed'}];s.invoices=[{amount:100,paid:100},{amount:100,paid:20}];const t=dashboardTotals(s);assert.equal(t.minutes,120);assert.equal(t.billableMinutes,90);assert.equal(t.accepted,1);assert.equal(t.signed,1);assert.equal(t.completed,1);assert.equal(t.paid.length,1);});
test('calendar week and multi-day events retain all-day exclusive end',()=>{const w=calendarWeek(0,new Date(2026,9,20,12));assert.equal(w.start.getDate(),19);assert.equal(w.end.getDate(),26);const events=[{id:'a',allDay:true,start:'2026-10-19',end:'2026-10-21'},{id:'b',allDay:true,start:'2026-10-20',end:'2026-10-20'}];assert.equal(eventsOnDay(events,w.days[1]).length,2);assert.equal(eventsOnDay(events,w.days[2]).length,0);});
test('proposal and contract workflows create the correct type and isolate lifecycle triggers',()=>{const s=emptyWorkspace({name:'Test'}),c=saveClient(s,{name:'Client',contact:'Client',email:'client@example.com'});executeWorkspaceAction(s,'proposal.create',c.id,{title:'Proposal',body:'Scope'});executeWorkspaceAction(s,'contract.create',c.id,{title:'Contract',body:'Terms'});assert.equal(crmRecords(s,'proposals').length,1);assert.equal(crmRecords(s,'contracts').length,1);assert.equal(schemaFor(s,'contracts').action,'new-contract');const p=s.documents.find(d=>d.kind==='proposal'),contract=s.documents.find(d=>d.kind==='contract');assert.equal(contract.responseMode,'signature');saveWorkflow(s,{name:'After proposal acceptance',enabled:true,triggers:[{type:'proposal.accepted',filter:{}}],steps:[{type:'contract.create',config:{title:'Next contract',body:'Terms'}}]});const before=snapshotWorkspace(s);p.status='accepted';contract.status='signed';const types=detectEvents(before,s).map(e=>e.type);assert.ok(types.includes('proposal.accepted'));assert.ok(types.includes('contract.signed'));assert.ok(!types.includes('contract.accepted'));assert.ok(types.includes('document.accepted'));runWorkflows(s,before);assert.equal(s.documents.filter(d=>d.kind==='contract').length,2);assert.equal(s.automation.runs[0].status,'succeeded');});

test('date ranges use local calendar boundaries and reject reversed or impossible custom dates',async()=>{
 const {dashboardRange}=await import('../public/dashboard-domain.js');
 const now=new Date(2026,0,5,18);
 assert.equal(dashboardRange(),null);
 assert.deepEqual(dashboardRange('month',now),{start:'2026-01-01',end:'2026-01-05'});
 assert.deepEqual(dashboardRange('last-month',now),{start:'2025-12-01',end:'2025-12-31'});
 assert.deepEqual(dashboardRange('year',now),{start:'2026-01-01',end:'2026-01-05'});
 assert.throws(()=>dashboardRange('custom',now,{start:'2026-02-30',end:'2026-03-01'}));
 assert.throws(()=>dashboardRange('custom',now,{start:'2026-02-03',end:'2026-02-01'}));
});
test('totals filter by work, final payment and completion dates, not creation or edit dates',()=>{
 const s=emptyWorkspace({name:'Test'}),range={start:'2026-10-01',end:'2026-10-31'};
 s.time=[{date:'2026-10-01',minutes:60},{date:'2026-10-31',minutes:90},{date:'2026-11-01',minutes:200},{date:'2026-10-20',minutes:30,billable:false},{date:'2026-10-02',minutes:90,archived:true}];
 s.invoices=[{id:'paid',amount:100,paid:100,paidAt:'2026-10-31'},{amount:200,paid:200,paidAt:'2026-09-30'},{amount:300,paid:100,paidAt:'2026-10-12'}];
 s.projects=[{status:'completed',completedAt:'2026-10-10'},{status:'completed',updatedAt:'2026-10-10'},{status:'completed',completedAt:'2026-09-30'},{status:'active',completedAt:'2026-10-01'}];
 s.documents=[{kind:'contract',status:'signed',currentVersion:2,versions:[{number:1,completedAt:'2026-09-12'},{number:2,completedAt:'2026-10-15'}]},{kind:'proposal',status:'accepted',completedAt:'2026-10-31'},{kind:'proposal',status:'accepted',updatedAt:'2026-10-31'}];
 const t=dashboardTotals(s,range);assert.equal(t.billableMinutes,150);assert.equal(t.minutes,180);assert.deepEqual(t.paid.map(i=>i.id),['paid']);assert.equal(t.completed,1);assert.equal(t.signed,1);assert.equal(t.accepted,1);
 assert.equal(dashboardTotals(s).completed,3);
});
test('greeting uses first name and local time, and daily navigation crosses month and year boundaries',async()=>{
 const {dashboardGreeting,calendarDay,localDateKey}=await import('../public/dashboard-domain.js');
 for(const [hour,label] of [[8,'morning'],[12,'afternoon'],[17,'afternoon'],[18,'evening']])assert.equal(dashboardGreeting('  Lucas Didier ',new Date(2026,10,1,hour)),`Good ${label}, Lucas`);
 assert.equal(dashboardGreeting('',new Date(2026,10,1,8)),'Good morning');
 const day=calendarDay(1,new Date(2026,11,31,23));assert.equal(localDateKey(day.start),'2027-01-01');assert.equal(localDateKey(day.end),'2027-01-02');
 assert.equal(eventsOnDay([{allDay:true,start:'2027-01-01',end:'2027-01-02'}],day.start).length,1);
 assert.equal(eventsOnDay([{allDay:true,start:'2027-01-01',end:'2027-01-02'}],day.end).length,0);
});
test('project completion date survives edits and resets when reopened and completed again',async()=>{
 const {createProject,updateProject}=await import('../public/domain.js');
 const s=emptyWorkspace({name:'Test'}),c=saveClient(s,{name:'Client',contact:'Client',email:'client@example.com'}),p=createProject(s,{name:'Project',clientId:c.id,budget:10000});
 updateProject(s,p.id,{...p,status:'completed'});assert.ok(p.completedAt);const stamp=p.completedAt;
 updateProject(s,p.id,{...p,name:'Renamed'});assert.equal(p.completedAt,stamp);
 updateProject(s,p.id,{...p,status:'active'});assert.equal(p.completedAt,null);
});
