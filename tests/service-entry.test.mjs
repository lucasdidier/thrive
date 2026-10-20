import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace,createDocument,saveDocument} from '../public/workspace-domain.js';
import {saveService,serviceOffer} from '../public/services-domain.js';
import {matchingServices,invoiceServiceLines,resolveNewServices} from '../public/service-entry-domain.js';
import {saveInvoiceDraft,issueInvoiceDraft} from '../public/invoice-domain.js';
import {invoicePaper} from '../public/invoice-paper.js';
import {clientProjection} from '../server/sharing.mjs';
import {validateWorkspace} from '../server/validation.mjs';
const fresh=()=>{const s=initBilling(upgradeWorkspace(seed()));s.services=[];return s;};
const entry=(name,rate=25000)=>({description:name,details:'Discovery and recommendations',quantity:2,rate,createService:true});

test('service lookup ignores archived entries, normalizes exact names, and offers creation only for new names',()=>{
 const s=fresh(),a=saveService(s,{name:'Brand Strategy',kind:'service',items:[{description:'Workshop',quantity:1,rate:10000}]}),b=saveService(s,{name:'Brand Strategy Plus',kind:'service',items:[{description:'Workshop',quantity:1,rate:20000}]});
 assert.equal(matchingServices(s,'  brand   strategy ').canCreate,false);
 assert.equal(matchingServices(s,'Brand').matches.length,2);
 assert.equal(matchingServices(s,'brand strategy').matches[0].id,a.id);
 assert.equal(matchingServices(s,'New service').canCreate,true);
 assert.equal(matchingServices(s,'').canCreate,false);
 assert.equal(matchingServices(s,'x'.repeat(101)).canCreate,false);
 b.archived=true;assert.equal(matchingServices(s,'Plus').matches.length,0);
});
test('inline creation deduplicates names and never changes an existing catalog price',()=>{
 const s=fresh(),lines=resolveNewServices(s,[entry('Website audit'),entry(' website AUDIT ',30000)],{invoice:true});
 assert.equal(s.services.length,1);assert.equal(lines[0].serviceId,lines[1].serviceId);
 assert.equal(lines[1].rate,30000);assert.equal(s.services[0].items[0].rate,25000);
 assert.equal(lines[0].createService,undefined);
 const offer=serviceOffer(s,lines[0].serviceId);assert.equal(offer.description,'Discovery and recommendations');assert.equal(offer.quantity,2);
 const selected=invoiceServiceLines(s,lines[0].serviceId);selected[0].rate=1;assert.equal(s.services[0].items[0].rate,25000);
 const before=JSON.stringify(s);assert.throws(()=>resolveNewServices(s,[entry('Valid new'),entry('Needs price',0)],{invoice:true}),/Set a rate greater than zero/);assert.equal(JSON.stringify(s),before);
});
test('selecting a package yields independent invoice lines with descriptions and rate units intact',()=>{
 const s=fresh(),p=saveService(s,{name:'Launch package',kind:'package',items:[{description:'Research',details:'Audience interviews',quantity:1,rate:10000},{description:'Design',quantity:2,rate:20000}]});
 const lines=invoiceServiceLines(s,p.id);assert.equal(lines.length,2);assert.equal(lines[0].description,'Research');assert.equal(lines[0].details,'Audience interviews');assert.equal(lines[1].quantity,2);assert.equal(lines[1].packageName,'Launch package');
 assert.equal(lines.reduce((sum,l)=>sum+l.quantity*l.rate,0),p.amount);
});
test('invoice item details survive saving, issuance, public projection and immutable history checks',()=>{
 const s=fresh(),items=resolveNewServices(s,[entry('Audit')],{invoice:true});
 items[0].details='<script>unsafe</script>\nIncluded work';
 const draft=saveInvoiceDraft(s,{clientId:'c1',issued:'2026-10-20',due:'2026-11-03',items});
 assert.equal(draft.items[0].details,items[0].details);
 const invoice=issueInvoiceDraft(s,draft.id),before=structuredClone(s);
 const projection=clientProjection(s,{entity:'invoice',recordId:invoice.id});
 assert.equal(projection.data.items[0].details,items[0].details);
 assert.ok(invoicePaper(projection.data).includes('&lt;script&gt;'));assert.ok(!invoicePaper(projection.data).includes('<script>'));
 invoice.items[0].details='Changed';assert.throws(()=>validateWorkspace(s,before),/cannot change its items/);
});
test('a new proposal service is committed only with a valid document draft',()=>{
 const s=fresh(),d=createDocument(s,{clientId:'c1',templateId:'simple-proposal'}),before=JSON.stringify(s),next=structuredClone(s);
 const [offer]=resolveNewServices(next,[{id:'new-offer',name:'Audit',description:'Review and recommendations',quantity:1,min:1,max:1,rate:15000,mode:'required',group:'',createService:true}]);
 assert.throws(()=>saveDocument(next,d.id,{...d,title:'',offers:[offer]}),/title and content/);
 assert.equal(JSON.stringify(s),before);
 saveDocument(next,d.id,{...d,scope:'Provide an audit',offers:[offer]});Object.assign(s,next);
 assert.equal(s.services.length,1);assert.equal(s.documents.find(x=>x.id===d.id).offers[0].serviceId,s.services[0].id);
});
