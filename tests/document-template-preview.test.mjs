import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkspace} from '../server/account-workspace.mjs';
import {saveClient,createProject} from '../public/domain.js';
import {documentTemplatePreview} from '../public/document-template-preview.js';
import {documentTemplates} from '../public/document-design.js';
test('browsing all document templates leaves workspace records and project billing untouched',()=>{
 const s=emptyWorkspace({name:'Alex',email:'alex@example.com'}),c=saveClient(s,{name:'Client',email:'client@example.com',contact:'Alex'}),p=createProject(s,{name:'Project',clientId:c.id,budget:100000});const before=JSON.stringify(s);
 for(const t of [...documentTemplates,{id:'',kind:'proposal'}]){const preview=documentTemplatePreview(s,{templateId:t.id,kind:t.kind,clientId:c.id,projectId:p.id});assert.match(preview.html,/Prepared for/);assert.equal(JSON.stringify(s),before);}
});
test('preview reflects selection, title, recipient and workspace branding with escaped content',()=>{
 const s=emptyWorkspace({name:'Alex',email:'alex@example.com'}),c=saveClient(s,{name:'A & B',email:'client@example.com',contact:'Alex'});s.settings.documentDesign={template:'studio',color:'#345678',issuerDetails:'Studio address',footer:'Thank you'};
 const data={clientId:c.id,kind:'proposal',title:'<script>Title</script>'};
 const simple=documentTemplatePreview(s,{...data,templateId:'simple-proposal'}),packages=documentTemplatePreview(s,{...data,templateId:'package-proposal'}),blank=documentTemplatePreview(s,{...data,templateId:''});
 assert.notEqual(simple.html,packages.html);assert.match(simple.html,/template-studio/);assert.match(simple.html,/Studio address/);assert.match(simple.html,/A &amp; B/);assert.match(simple.html,/&lt;script&gt;Title/);assert.match(packages.html,/Choose your package/);assert.match(blank.html,/Your content will appear here/);assert.doesNotMatch(blank.html,/Scope of work/);
});
