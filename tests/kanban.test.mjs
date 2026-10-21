import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace,saveForm} from '../public/workspace-domain.js';
import {saveField,setFieldValue} from '../public/custom-fields-domain.js';
import {defaultConfig,crmRecords,saveCRMView,viewsFor} from '../public/crm-domain.js';
import {initWorkflows,saveWorkflow,snapshotWorkspace,detectEvents} from '../public/workflow-domain.js';
import {boardDefaults,boardRecords,boardGroups,moveBoardCard} from '../public/kanban-domain.js';
const fresh=()=>{const s=initBilling(upgradeWorkspace(seed()));initWorkflows(s);return s;};
const field=key=>({key,label:key,group:true});
function request(s,scope,id,to,{key=boardDefaults[scope],fields=[field(key)],config={},beforeId=null}={}){
 const c={...defaultConfig(scope==='workflows'?'clients':scope,s),groupBy:key,...config},rows=boardRecords(s,scope),groups=boardGroups(s,scope,c,fields,rows);
 return {scope,config:c,fields,id,fromKey:groups.find(g=>g.rows.some(r=>r.id===id)).key,toKey:groups.find(g=>g.label===to||to===null&&g.empty).key,beforeId};
}
test('all core CRM lists offer a board and persist its layout in saved views',()=>{
 const s=fresh();for(const scope of ['clients','projects','documents','invoices','forms']){
  assert.ok(viewsFor(s,scope).some(v=>v.config.layout==='board'));
  const config={...defaultConfig(scope,s),layout:'board',groupBy:boardDefaults[scope]};const v=saveCRMView(s,scope,'My board',config);
  assert.deepEqual(viewsFor(JSON.parse(JSON.stringify(s)),scope).find(x=>x.id===v.id).config,config);
 }
});
test('empty stage columns remain drop targets even when filters remove all their cards',()=>{
 const s=fresh(),config={groupBy:'status'},fields=[field('status')],rows=crmRecords(s,'projects');
 const groups=boardGroups(s,'projects',config,fields,rows.filter(r=>r.status==='active'),rows);
 assert.deepEqual(groups.map(g=>g.label),['planned','awaiting deposit','active','completed','cancelled']);
 assert.equal(groups.find(g=>g.label==='completed').rows.length,0);
});
test('custom choice columns use option identities, support empty values and emit real field events',()=>{
 const s=fresh(),f=saveField(s,'client',{name:'Stage',type:'select',options:[{label:'New'},{label:'Qualified'},{label:'Won'}]}),id=s.clients[0].id,fields=[{key:f.id,label:f.name,custom:true,type:f.type,group:true}],before=snapshotWorkspace(s);
 moveBoardCard(s,request(s,'clients',id,'Qualified',{key:f.id,fields}));
 assert.equal(s.clients.find(c=>c.id===id).customFields[f.id],f.options[1].id);
 assert.ok(detectEvents(before,s).some(e=>e.type==='client.field_changed'));
 const gs=boardGroups(s,'clients',{groupBy:f.id},fields,crmRecords(s,'clients'));
 assert.deepEqual(gs.map(g=>g.label),['New','Qualified','Won','No stage']);
 moveBoardCard(s,request(s,'clients',id,null,{key:f.id,fields}));assert.equal(s.clients.find(c=>c.id===id).customFields[f.id],undefined);
});
test('client service and form service moves preserve contacts, submissions and form questions',()=>{
 const s=fresh(),c=s.clients[0],target=s.clients.find(r=>r.tag!==c.tag),email=c.email;
 moveBoardCard(s,request(s,'clients',c.id,target.tag));assert.equal(s.clients.find(r=>r.id===c.id).tag,target.tag);assert.equal(s.clients.find(r=>r.id===c.id).email,email);
 const a=saveForm(s,{name:'A',title:'A',service:'Design',tag:'Lead'}),b=saveForm(s,{name:'B',title:'B',service:'Strategy',tag:'Qualified'}),before=structuredClone(a);
 moveBoardCard(s,request(s,'forms',a.id,b.service));assert.deepEqual(s.forms.find(f=>f.id===a.id),{...before,service:'Strategy'});
});
test('moving the last card out of a service keeps an empty destination for moving it back',()=>{
 const s=fresh(),a=s.clients[0],b=s.clients.find(c=>c.tag!==a.tag);s.clients=s.clients.filter(c=>c.id===a.id||c.id===b.id);const original=a.tag;
 moveBoardCard(s,request(s,'clients',a.id,b.tag));const copy=JSON.parse(JSON.stringify(s)),rows=crmRecords(copy,'clients');
 assert.equal(boardGroups(copy,'clients',{groupBy:'tag'},[field('tag')],rows).find(g=>g.label===original).rows.length,0);
 moveBoardCard(copy,request(copy,'clients',a.id,original));assert.equal(copy.clients.find(c=>c.id===a.id).tag,original);
});
test('project stages enforce delivery prerequisites and never partially mutate on failure',()=>{
 const s=fresh(),p=s.projects.find(p=>!p.accepted),before=structuredClone(s);
 assert.throws(()=>moveBoardCard(s,request(s,'projects',p.id,'active')),/deposit/);assert.deepEqual(s,before);
 moveBoardCard(s,request(s,'projects',p.id,'cancelled'));assert.equal(s.projects.find(r=>r.id===p.id).status,'cancelled');
 const cancelled=structuredClone(s);assert.throws(()=>moveBoardCard(s,request(s,'projects',p.id,'planned')),/reopen/);assert.deepEqual(s,cancelled);
});
test('dropping invoices or documents cannot fabricate payments, publication or client responses',()=>{
 const s=fresh(),invoice=crmRecords(s,'invoices').find(r=>r.status!=='paid'),doc=crmRecords(s,'documents').find(r=>r.status!=='signed'),before=structuredClone(s);
 assert.throws(()=>moveBoardCard(s,request(s,'invoices',invoice.id,'paid')),/payment/);
 assert.throws(()=>moveBoardCard(s,request(s,'documents',doc.id,'signed')),/client/);assert.deepEqual(s,before);
});
test('moving workflows activates valid rules and rejects invalid rules atomically',()=>{
 const s=fresh(),w=saveWorkflow(s,{name:'Tag new clients',enabled:false,triggers:[{type:'client.created',filter:{}}],steps:[{type:'client.add_tag',targetId:'related',config:{tag:'New'}}]});
 moveBoardCard(s,request(s,'workflows',w.id,'Active'));assert.equal(s.automation.workflows.find(r=>r.id===w.id).enabled,true);
 moveBoardCard(s,request(s,'workflows',w.id,'Paused'));assert.equal(s.automation.workflows.find(r=>r.id===w.id).enabled,false);
 moveBoardCard(s,request(s,'workflows',w.id,'Not run',{key:'lastRun'}));assert.equal(s.automation.workflows.find(r=>r.id===w.id).enabled,false);
 s.automation.workflows.find(r=>r.id===w.id).steps[0].type='deleted-action';const before=structuredClone(s);
 assert.throws(()=>moveBoardCard(s,request(s,'workflows',w.id,'Active')));assert.deepEqual(s,before);
});
test('manual ordering survives reloads and filtered moves retain hidden cards in their relative order',()=>{
 const s=fresh();s.clients.forEach(c=>c.tag='Design');const [a,hidden,b,c]=s.clients;
 moveBoardCard(s,request(s,'clients',c.id,'Design',{beforeId:b.id}));
 const config={groupBy:'tag'},fields=[field('tag')],copy=JSON.parse(JSON.stringify(s)),all=crmRecords(copy,'clients');
 assert.deepEqual(boardGroups(copy,'clients',config,fields,all)[0].rows.map(r=>r.id),[a.id,hidden.id,c.id,b.id,...s.clients.slice(4).map(r=>r.id)]);
 assert.deepEqual(boardGroups(copy,'clients',config,fields,all.filter(r=>r.id!==hidden.id),all)[0].rows.slice(0,3).map(r=>r.id),[a.id,c.id,b.id]);
 const before=structuredClone(copy);assert.throws(()=>moveBoardCard(copy,request(copy,'clients',a.id,'Design',{config:{sort:'name'}})),/Clear Sort/);assert.deepEqual(copy,before);
});
test('stale source, missing targets, archived records and archived fields reject moves without writes',()=>{
 const s=fresh(),a=s.clients[0],b=s.clients.find(c=>c.tag!==a.tag),move=request(s,'clients',a.id,b.tag);
 s.clients[0].tag='Changed elsewhere';let before=structuredClone(s);assert.throws(()=>moveBoardCard(s,move),/moved while/);assert.deepEqual(s,before);
 const freshMove=request(s,'clients',a.id,b.tag);s.clients[0].archived=true;before=structuredClone(s);assert.throws(()=>moveBoardCard(s,freshMove),/Restore/);assert.deepEqual(s,before);
 s.clients[0].archived=false;const f=saveField(s,'client',{name:'Stage',type:'select',options:[{label:'A'},{label:'B'}]}),fields=[{key:f.id,label:f.name,type:'select',custom:true,group:true}];setFieldValue(s,'client',a.id,f.id,f.options[0].id);const customMove=request(s,'clients',a.id,'B',{key:f.id,fields});f.archived=true;before=structuredClone(s);assert.throws(()=>moveBoardCard(s,customMove));assert.deepEqual(s,before);
});
