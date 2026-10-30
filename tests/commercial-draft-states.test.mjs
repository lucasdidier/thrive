import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,initBilling} from '../public/domain.js';
import {upgradeWorkspace,createDocument,saveDocument,publishDocument,validateDraftOffers} from '../public/workspace-domain.js';
import {resolveNewServices} from '../public/service-entry-domain.js';
import {validateWorkspace} from '../server/validation.mjs';
const fresh=()=>initBilling(upgradeWorkspace(seed()));
const blank={id:'unfinished',name:'',description:'',rate:0,quantity:1,min:1,max:1,mode:'required',group:'',unit:'item',billingModel:'fixed'};
test('incomplete proposal content and line items survive saving and cannot be published',()=>{
 const s=fresh(),d=createDocument(s,{clientId:'c1'}),old=structuredClone(s);
 saveDocument(s,d.id,{title:'',scope:'',offers:[blank],billing:false,selectionMode:'fixed'},{draft:true});
 assert.equal(d.offers[0].name,'');assert.equal(d.offers[0].rate,0);assert.equal(d.scope,'');
 assert.doesNotThrow(()=>validateWorkspace(s,old));assert.throws(()=>publishDocument(s,d.id),/content/);
 saveDocument(s,d.id,{title:'Proposal',scope:'Scope',offers:[blank],billing:false,selectionMode:'fixed'},{draft:true});
 assert.throws(()=>publishDocument(s,d.id),/service name/);
 assert.throws(()=>saveDocument(s,d.id,{title:'Proposal',scope:'Scope',offers:[blank],billing:false}),/service name/);
 saveDocument(s,d.id,{title:'Proposal',scope:'Scope',offers:[{...blank,name:'Consulting',rate:5000}],billing:false,selectionMode:'fixed'});
 assert.equal(publishDocument(s,d.id).offers[0].rate,5000);
});
test('unfinished reusable services are deferred without losing the creation intent',()=>{
 const s=fresh(),count=s.services?.length||0;
 const lines=resolveNewServices(s,[{...blank,name:'Future service',createService:true}],{draft:true});
 assert.equal(lines[0].createService,true);assert.equal(s.services?.length||0,count);
 assert.throws(()=>resolveNewServices(s,lines),/greater than zero/);
 const resolved=resolveNewServices(s,[{...lines[0],rate:10000}],{draft:true});
 assert.ok(resolved[0].serviceId);assert.equal(resolved[0].createService,undefined);
});
test('draft offers still enforce bounded shape, identifiers and nesting',()=>{
 assert.throws(()=>validateDraftOffers(Array.from({length:21},(_,i)=>({...blank,id:`i${i}`}))),/20/);
 assert.throws(()=>validateDraftOffers([blank,blank]),/unique/);
 assert.throws(()=>validateDraftOffers([{...blank,rate:Infinity}]),/number/);
 assert.throws(()=>validateDraftOffers([{...blank,packageItems:[{...blank,packageItems:[blank]}]}]),/another package/);
});
