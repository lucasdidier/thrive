import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDocument} from 'htmlparser2';
import {createTimeUI} from '../public/time-ui.js';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {saveTimeEntry} from '../public/time-domain.js';
import {createTimeInvoiceDraft,issueInvoiceDraft,deleteInvoiceDraft} from '../public/invoice-domain.js';
const elements=node=>[node,...(node.children||[]).flatMap(elements)];
function harness(){
 const original=globalThis.document;globalThis.document={addEventListener(){}};
 const state=initBilling(upgradeWorkspace(seed()));let opened;
 const ui=createTimeUI({getState:()=>state,actorId:()=> 'owner',esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),icon:()=>'',btn:(label,action)=>`<button type="button" data-action="${action}">${label}</button>`,open:(title,html)=>opened={title,html}});
 globalThis.document=original;
 return {state,show(id){ui.handleClick('time-edit',{dataset:{id}});return {...opened,nodes:elements(parseDocument(opened.html))};}};
}
for(const billed of [false,true])test(`${billed?'billed':'draft-linked'} time keeps all fields disabled and links its invoice, even for an archived project`,()=>{
 const h=harness(),s=h.state;
 const t=saveTimeEntry(s,{projectId:s.projects[0].id,date:'2026-10-29',minutes:105,task:'Research',note:'Customer interviews',rate:12345,billable:true});
 const d=createTimeInvoiceDraft(s,{entryIds:[t.id],groupBy:'entry',additionalCharge:true});
 const invoice=billed?issueInvoiceDraft(s,d.id):d;
 s.projects[0].archived=true;
 const before=JSON.stringify(s),view=h.show(t.id),fields=view.nodes.filter(n=>['input','select'].includes(n.name));
 assert.equal(view.title,'Time entry details');assert.equal(fields.length,7);assert.ok(fields.every(n=>'disabled' in n.attribs));
 const field=name=>fields.find(n=>n.attribs.name===name);
 assert.equal(field('duration').attribs.value,'1:45');assert.equal(field('date').attribs.value,t.date);assert.equal(field('task').attribs.value,t.task);assert.equal(field('note').attribs.value,t.note);assert.equal(field('rate').attribs.value,'123.45');assert.ok('checked' in field('billable').attribs);
 assert.ok(view.nodes.some(n=>n.name==='option'&&n.attribs.value===t.projectId&&'selected' in n.attribs));
 assert.ok(view.nodes.some(n=>n.name==='button'&&n.attribs['data-action']==='invoice'&&n.attribs['data-id']===invoice.id));assert.ok(!view.nodes.some(n=>n.name==='form'||n.attribs?.type==='submit'));assert.equal(JSON.stringify(s),before);
});
test('removing a draft restores the editable entry form',()=>{
 const h=harness(),s=h.state,t=saveTimeEntry(s,{projectId:s.projects[0].id,date:'2026-10-29',minutes:60,note:'Review',rate:5000});
 const d=createTimeInvoiceDraft(s,{entryIds:[t.id],groupBy:'entry',additionalCharge:true});h.show(t.id);deleteInvoiceDraft(s,d.id);
 const view=h.show(t.id);assert.equal(view.title,'Edit time entry');assert.ok(view.nodes.some(n=>n.name==='form'));assert.ok(view.nodes.filter(n=>['input','select'].includes(n.name)).every(n=>!('disabled' in n.attribs)));assert.ok(!view.html.includes('time-linked-banner'));
});
