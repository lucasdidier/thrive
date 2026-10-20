import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationStatus,setConversationAttention,displayInitials,projectNextStep} from '../public/attention-domain.js';
import {dashboardPriorities} from '../public/dashboard-domain.js';
import {activityGroups,activityFeed} from '../public/activity-feed.js';
import {appendMissingActivity} from '../public/activity-audit.js';
const state=()=>({settings:{},activity:[],invoices:[],documents:[],projects:[],clients:[]});
const thread=()=>({id:'newsletter',messages:[{id:'message-1',direction:'incoming',subject:'Invitation: product webinar'}]});
test('incoming mail never implies a reply obligation, and only explicit intent persists',()=>{
 const s=state(),t=thread();assert.equal(conversationStatus(s,t),'Received');
 setConversationAttention(s,t,'reply');assert.equal(conversationStatus(JSON.parse(JSON.stringify(s)),t),'Needs reply');
 assert.equal(conversationStatus(s,{...t,id:'other'}),'Received');
 setConversationAttention(s,t,'done');assert.equal(conversationStatus(s,t),'No reply needed');
 t.messages.push({id:'message-2',direction:'incoming'});assert.equal(conversationStatus(s,t),'Received');
 setConversationAttention(s,t,'reply');t.messages.push({id:'reply-1',direction:'outgoing'});assert.equal(conversationStatus(s,t),'Sent');
 assert.equal(conversationStatus(s,{...t,archived:true}),'Archived');
 assert.throws(()=>setConversationAttention(s,t,'done'),/incoming/);
});
test('reply decisions can be cleared and do not flood workspace activity',()=>{
 const s=state(),before=structuredClone(s),t=thread();setConversationAttention(s,t,'reply');appendMissingActivity(before,s);assert.equal(s.activity.length,0);
 setConversationAttention(s,t,'clear');assert.equal(conversationStatus(s,t),'Received');assert.throws(()=>setConversationAttention(s,t,'invented'));
});
test('meaningful initials ignore demo prefixes and handle unicode',()=>{
 assert.equal(displayInitials({name:'[Demo] Northstar Labs',initials:'['}),'NL');assert.equal(displayInitials({name:'Émile Zola'}),'ÉZ');assert.equal(displayInitials({name:'Orbit'}),'OR');assert.equal(displayInitials({}),'?');
});
test('project blockers preserve commercial gating and point to the correct prerequisite',()=>{
 const s=state(),p={id:'p',status:'inquiry',billingPlan:[]};
 assert.equal(projectNextStep(s,p).action,'new-document');s.documents=[{id:'doc',projectId:'p',billing:true,status:'draft'}];
 assert.equal(projectNextStep(s,p).id,'doc');s.documents[0].status='published';assert.match(projectNextStep(s,p).title,/Waiting/);
 s.invoices=[{id:'deposit',projectId:'p',kind:'deposit',amount:100,paid:40}];assert.equal(projectNextStep(s,p).action,'invoice');
 assert.equal(projectNextStep(s,{...p,archived:true}).action,'archive-project');assert.equal(projectNextStep(s,{...p,status:'cancelled'}).action,'reopen-project');assert.equal(projectNextStep(s,{...p,status:'active'}),null);
 s.invoices=[];assert.equal(projectNextStep(s,{...p,accepted:true,billingPlan:[{amount:100}]}).action,'deposit');
});
test('Home priorities exclude completed work and informational documents, preserve partial balances',()=>{
 const s=state();s.invoices=[{id:'paid',amount:100,paid:100},{id:'partial',amount:100,paid:25,due:'2026-11-01'},{id:'first',amount:200,paid:0,due:'2026-10-01'}];
 s.documents=[{id:'wait',status:'published',responseMode:'signature'},{id:'info',status:'published',responseMode:'none'},{id:'archive',status:'published',archived:true}];
 s.projects=[{id:'done',status:'completed'},{id:'cancel',status:'cancelled'},{id:'active',status:'active'},{id:'archived',archived:true,status:'active'}];
 const p=dashboardPriorities(s);assert.deepEqual(p.outstanding.map(x=>x.id),['first','partial']);assert.equal(p.outstanding.reduce((n,i)=>n+i.amount-i.paid,0),275);assert.deepEqual(p.awaiting.map(x=>x.id),['wait']);assert.deepEqual(p.projects.map(x=>x.id),['active']);
});
test('notification groups do not invent timestamps for historic activity',()=>{
 const s=state();s.activity=[{id:'legacy',text:'Invoice paid',time:'Just now'},{id:'new',text:'Invoice paid',createdAt:new Date(2026,9,20,12).toISOString()},{id:'manual',text:'Client created'}];
 const groups=activityGroups(activityFeed(s,[],true),new Date(2026,9,20,15));assert.deepEqual(groups.map(g=>g[0]),['Today','Undated activity']);assert.equal(groups[1][1][0].id,'legacy');
});
