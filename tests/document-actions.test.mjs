import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling,createProject} from '../public/domain.js';
import {upgradeWorkspace,createDocument,deleteDocumentDraft,publishDocument,reviseDocument} from '../public/workspace-domain.js';
import {documentRecordActions} from '../public/record-actions.js';
import {validateWorkspace} from '../server/validation.mjs';

const fresh=()=>initBilling(upgradeWorkspace(seed()));
test('deleting an unpublished draft releases its project billing link without touching other records',()=>{
 const s=fresh(),p=createProject(s,{clientId:'c1',name:'New project',budget:100000}),d=createDocument(s,{clientId:'c1',projectId:p.id,templateId:'simple-proposal'});
 assert.equal(p.billingDocumentId,d.id);
 const old=structuredClone(s),invoices=JSON.stringify(s.invoices);
 deleteDocumentDraft(s,d.id);
 assert.equal(p.billingDocumentId,undefined);
 assert.equal(s.documents.length,old.documents.length-1);
 assert.equal(JSON.stringify(s.invoices),invoices);
 assert.doesNotThrow(()=>validateWorkspace(s,old));
 const replacement=createDocument(s,{clientId:'c1',projectId:p.id,templateId:'simple-proposal'});
 assert.equal(replacement.billing,true);
});
test('published history cannot be deleted even after creating a draft revision',()=>{
 const s=fresh(),d=createDocument(s,{clientId:'c1',templateId:'simple-proposal'});
 publishDocument(s,d.id);const original=JSON.stringify(s);
 assert.throws(()=>deleteDocumentDraft(s,d.id),/cannot be deleted/);assert.equal(JSON.stringify(s),original);
 reviseDocument(s,d.id);const revised=JSON.stringify(s);
 assert.throws(()=>deleteDocumentDraft(s,d.id),/cannot be deleted/);assert.equal(JSON.stringify(s),revised);
 const prior=structuredClone(s);s.documents=s.documents.filter(x=>x.id!==d.id);
 assert.throws(()=>validateWorkspace(s,prior),/cannot be deleted/);
});
test('list actions distinguish drafts, revisions, completed agreements and issued invoices',()=>{
 const s=fresh(),d=createDocument(s,{clientId:'c1',templateId:'service-contract'}),row={raw:d,status:d.status};
 const actions=(entity='contracts',r=row)=>documentRecordActions(s,entity,r).items.map(x=>x[1]);
 assert.deepEqual(actions(),['doc-edit','doc-delete']);
 publishDocument(s,d.id);assert.deepEqual(actions(),['document','doc-revise-request','doc-archive']);
 d.status='signed';assert.deepEqual(actions(),['document','doc-archive']);
 d.archived=true;assert.deepEqual(actions(),['document','doc-archive']);
 assert.deepEqual(actions('invoices',{status:'draft'}),['edit-invoice-draft','delete-invoice-draft']);
 assert.deepEqual(actions('invoices',{status:'paid'}),['invoice']);
 assert.match(documentRecordActions(s,'invoices',{status:'issued'}).note,/locked/);
});
