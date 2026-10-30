import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {initScheduling} from '../public/scheduling-domain.js';
import {initWorkflows,saveWorkflow,testWorkflow} from '../public/workflow-domain.js';
import {createWorkflowUI} from '../public/workflow-ui.js';

const setup=()=>{const s=initBilling(upgradeWorkspace(seed()));initScheduling(s);initWorkflows(s);return s;};
const rule=email=>({name:'Create contact',enabled:false,triggers:[{type:'client.created',filter:{}}],steps:[{type:'client.create',config:{name:'{{client.name}}',contact:'{{client.contact}}',email}}]});

test('workflow email accepts literal addresses and known trigger variables, but rejects invalid input',()=>{
 const s=setup();
 for(const email of ['new@example.com','{{client.email}}','{{ client.email }}','copy+{{client.email}}'])assert.equal(saveWorkflow(s,rule(email)).steps[0].config.email,email);
 for(const email of ['invalid','name@','{{client.email'])assert.throws(()=>saveWorkflow(s,rule(email)),/valid email/);
 assert.throws(()=>saveWorkflow(s,rule('{{secret.email}}')),/Unknown variable/);
 assert.throws(()=>saveWorkflow(s,rule('{{project.name}}')),/unavailable/);
});

test('workflow resolves email templates for dry runs and rejects an invalid resolved address without mutation',()=>{
 const s=setup(),client=s.clients[0],w=saveWorkflow(s,rule('copy+{{client.email}}'));
 let before=JSON.stringify(s);
 assert.equal(testWorkflow(s,w,client.id).status,'succeeded');
 assert.equal(JSON.stringify(s),before);
 client.email='invalid';before=JSON.stringify(s);
 assert.throws(()=>testWorkflow(s,w,client.id),/valid email/);
 assert.equal(JSON.stringify(s),before);
});

test('workflow editor renders email templates as text with email keyboard and required validation',()=>{
 const state=setup(),w=saveWorkflow(state,rule('{{client.email}}'));let html='';
 const ui=createWorkflowUI({getState:()=>state,open:(_,markup)=>{html=markup;},dialog:{querySelector:()=>null,classList:{add(){}}},btn:()=>'',icon:()=>'',esc:String});
 ui.handleClick('wf-edit',{dataset:{id:w.id}});
 const input=html.match(/<input name="config-email"[^>]*>/)?.[0];
 assert.ok(input);assert.match(input,/type="text"/);assert.match(input,/inputmode="email"/);
 assert.match(input,/value="\{\{client.email\}\}"/);assert.match(input,/\brequired\b/);
 assert.match(html,/Enter an email address or a trigger variable/);
});
