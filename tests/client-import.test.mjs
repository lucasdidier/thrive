import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {saveField} from '../public/custom-fields-domain.js';
import {clientImportTemplate,parseClientCSV,inferClient,previewClientImport,importClients} from '../public/client-import-domain.js';
import {executeOperation} from '../server/operations.mjs';
import {validateWorkspace} from '../server/validation.mjs';
const state=()=>initBilling(upgradeWorkspace(seed()));
test('email-only imports infer names and providers, preserve explicit types and values, avoid role names',()=>{
 for(const domain of ['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','proton.me'])assert.equal(inferClient({email:'jane.doe+news@'+domain}).data.type,'individual',domain);
 let d=inferClient({email:'jane.doe42+news@gmail.com'}).data;assert.equal(d.firstName,'Jane');assert.equal(d.lastName,'Doe');assert.equal(d.companyName,'');
 d=inferClient({email:'Jane_Doe@studio.co.uk',type:'individual',firstName:'Janet',companyName:'My Brand'}).data;assert.equal(d.type,'individual');assert.equal(d.firstName,'Janet');assert.equal(d.lastName,'Doe');assert.equal(d.companyName,'My Brand');
 assert.equal(inferClient({email:'a@gmail.com',type:'company'}).data.type,'company');
 assert.equal(inferClient({email:'support@blue-studio.co.uk'}).data.companyName,'Blue Studio');assert.equal(inferClient({email:'support@blue-studio.co.uk'}).data.firstName,'');
 assert.equal(inferClient({email:'johndoe@mybrand.com'}).data.lastName,'');assert.equal(inferClient({email:'123@gmail.com'}).data.name,'123@gmail.com');
 assert.throws(()=>inferClient({email:'x@x.com',type:'person'}),/type/);assert.throws(()=>inferClient({email:'not-email'}),/email/);
});
test('CSV parser handles BOM, quotes, commas, multiline, CRLF, semicolon and rejects malformed input',()=>{
 const p=parseClientCSV('\ufeffEmail,Client name\r\na@example.com,"A, \"\"Studio\"\"\nTeam"\r\n');assert.equal(p.rows[0][1],'A, "Studio"\nTeam');
 assert.equal(parseClientCSV('Email;First name\na@example.com;Jane').headers.length,2);
 for(const text of ['email,email\na,b','email\n"unfinished','email\n"a"bad','email','email\n'+Array(501).fill('a@gmail.com').join('\n')])assert.throws(()=>parseClientCSV(text));
 assert.throws(()=>parseClientCSV('x'.repeat(2_000_001)),/2 MB/);
});
test('dynamic template includes every custom field and types validate labels, numbers, booleans and dates',()=>{
 const s=state();const fields=[['Score','number'],['Budget','currency'],['Joined','date'],['Newsletter','checkbox'],['Channel','select'],['Interests','multiselect'],['Website','url']].map(([name,type])=>saveField(s,'client',{name,type,options:['select','multiselect'].includes(type)?[{label:'Design'},{label:'Consulting'}]:[]}));
 const t=clientImportTemplate(s);for(const f of fields)assert.ok(t.fields.some(x=>x.key===f.id));assert.equal(parseClientCSV(t.csv).headers.length,t.fields.length);
 const csv='Email,Custom: Score,Custom: Budget,Custom: Joined,Custom: Newsletter,Custom: Channel,Custom: Interests,Custom: Website\na@gmail.com,0,125.50,2026-10-19,false,Design,Design|Consulting,https://example.com';
 const p=previewClientImport(s,{csv});assert.equal(p.summary.ready,1);const vals=p.rows[0].data.customFields;assert.equal(vals[fields[0].id],0);assert.equal(vals[fields[3].id],false);assert.deepEqual(vals[fields[5].id],fields[5].options.map(o=>o.id));
 const r=importClients(s,{csv});assert.equal(s.clients.find(c=>c.id===r.ids[0]).customFields[fields[1].id],125.5);validateWorkspace(s);
 const bad=previewClientImport(s,{csv:csv.replace('2026-10-19','2026-02-30')});assert.equal(bad.summary.errors,1);
});
test('preview is pure; duplicate emails including archived are skipped; errors require explicit skip; mapping is strict',()=>{
 const s=state();s.clients[0].archived=true;const before=structuredClone(s),csv=`Email,Client type\n${s.clients[0].email.toUpperCase()},\njane.doe@gmail.com,\nJANE.DOE@gmail.com,\ninvalid,\njane@business.com,person`;
 const p=previewClientImport(s,{csv});assert.deepEqual(s,before);assert.deepEqual(p.summary,{total:5,ready:1,duplicates:2,errors:2,inferred:3});assert.throws(()=>importClients(s,{csv}),/Fix invalid/);assert.deepEqual(s,before);
 const out=importClients(s,{csv,skip_invalid:true});assert.equal(out.imported,1);assert.equal(out.skipped.length,4);assert.deepEqual(s.clients.find(c=>c.id===before.clients[0].id),before.clients[0]);
 assert.equal(previewClientImport(s,{csv:'Work email,Given name,Other\na@business.com,Alex,ignored',mapping:{'Work email':'email','Given name':'firstName',Other:''}}).rows[0].data.firstName,'Alex');
 assert.throws(()=>previewClientImport(s,{csv:'X,Y\na,b',mapping:{X:'email',Y:'email'}}),/once/);assert.throws(()=>previewClientImport(s,{csv:'Name\nJoe'}),/Email/);
 assert.equal(previewClientImport(s,{csv:'Email,Type\nuser@example.com,individual,extra'}).summary.errors,1);
});
test('import action validates workspace and emits real client-created workflow events',()=>{
 const s=state(),before=structuredClone(s),out=executeOperation(s,'client.import',{csv:'Email\npat.person@gmail.com\nsales@business.com'},'import-action-test');assert.deepEqual(s,before);assert.equal(out.result.imported,2);assert.equal(out.events.filter(e=>e.type==='client.created').length,2);validateWorkspace(out.state,s);
});
test('maximum batch is atomic and names preserve explicit values including formula-like text',()=>{
 const s=state(),csv='Email\n'+Array.from({length:500},(_,i)=>`person${i}@gmail.com`).join('\n');const out=executeOperation(s,'client.import',{csv},'max-import-test');assert.equal(out.result.imported,500);assert.equal(out.events.filter(e=>e.type==='client.created').length,500);validateWorkspace(out.state,s);
 assert.equal(inferClient({email:'janeDoe@gmail.com'}).data.lastName,'Doe');assert.equal(inferClient({email:'a@gmail.com',name:'=My brand'}).data.name,'=My brand');
});
