import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,saveClient,initBilling,createProject,updateProject} from '../public/domain.js';
import {upgradeWorkspace,saveForm} from '../public/workspace-domain.js';
import {validateWorkspace} from '../server/validation.mjs';
import {initScheduling,availableSlots,bookMeeting} from '../public/scheduling-domain.js';
const fresh=()=>initBilling(upgradeWorkspace(seed()));
test('individual clients need no company contact and edits preserve existing documents',()=>{
 const s=fresh(),before=JSON.stringify(s.documents),c=saveClient(s,{name:'Taylor',type:'individual',email:'taylor@example.com'});
 assert.equal(c.contact,'Taylor');assert.equal(c.type,'individual');saveClient(s,{...c,name:'Taylor Smith'},c.id);assert.equal(c.contact,'Taylor Smith');
 assert.equal(JSON.stringify(s.documents),before);assert.throws(()=>saveClient(s,{...c,type:'company',contact:''},c.id));
 saveClient(s,{...c,type:'company',contact:'Taylor'},c.id);assert.equal(c.type,'company');
 assert.throws(()=>saveClient(s,{...c,type:'invalid'},c.id));
});
test('old company clients retain their type and logos are bounded raster data',()=>{
 const s=fresh(),c=s.clients[0];saveClient(s,{...c,tag:'Updated'},c.id);assert.equal(c.type,'company');
 const old=structuredClone(s);c.logo='data:image/webp;base64,YWJj';assert.doesNotThrow(()=>validateWorkspace(s,old));
 for(const logo of ['https://example.com/logo','data:image/svg+xml;base64,YWJj','x'.repeat(150001)]){c.logo=logo;assert.throws(()=>validateWorkspace(s,old),/logo/);}
});
test('forms created for a client/project retain valid associations and reject unrelated projects',()=>{
 const s=fresh(),p=s.projects[0],c=s.clients.find(c=>c.id===p.clientId),base={...s.forms[0],name:'Project feedback',clientId:c.id,projectId:p.id};
 const f=saveForm(s,base);assert.equal(f.clientId,c.id);assert.equal(f.projectId,p.id);
 saveForm(s,{...f,title:'Updated feedback'},f.id);assert.equal(f.projectId,p.id);
 const other=s.projects.find(x=>x.clientId!==c.id);assert.throws(()=>saveForm(s,{...base,projectId:other.id}),/project/);
});
test('meetings retain their project context and cannot link another client project',()=>{
 const s=fresh(),now=Date.parse('2026-10-19T07:00:00Z');initScheduling(s,'Europe/Lisbon');const p=s.projects[0],c=s.clients.find(c=>c.id===p.clientId);
 const data={name:c.name,contact:c.contact,email:c.email,projectId:p.id,start:availableSlots(s,'discovery','2026-10-19',now)[0]};
 const m=bookMeeting(s,'discovery',data,'record-meeting',now);assert.equal(m.projectId,p.id);assert.equal(m.clientId,c.id);
 const other=s.projects.find(x=>x.clientId!==c.id),before=JSON.stringify(s);assert.throws(()=>bookMeeting(s,'discovery',{...data,start:availableSlots(s,'discovery','2026-10-19',now)[0],projectId:other.id},'wrong-project',now),/project/);assert.equal(JSON.stringify(s),before);
});

test('project client changes are inline-safe only before related work exists',()=>{
 const s=fresh(),p=createProject(s,{name:'New project',clientId:'c1',budget:10000});
 updateProject(s,p.id,{...p,clientId:'c2'});assert.equal(p.clientId,'c2');
 const existing=s.projects.find(x=>x.id==='p1');assert.throws(()=>updateProject(s,existing.id,{...existing,clientId:'c2'}),/linked work/);assert.equal(existing.clientId,'c1');
});
