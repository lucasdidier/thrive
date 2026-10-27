import test from 'node:test';
import assert from 'node:assert/strict';
import {applyComposeTemplate,createCommunicationsUI} from '../public/communications-ui.js';
const flush=async()=>{for(let n=0;n<8;n++)await new Promise(resolve=>setImmediate(resolve));};
test('templates preserve authored prose until applied; insertion, replacement and undo retain reply subject',()=>{
 const form={dataset:{},elements:{subject:{value:'My subject'},body:{value:'My carefully written message'}}};
 const undo=applyComposeTemplate(form,{subject:'Template subject',body:'Template text'},'insert');
 assert.equal(form.elements.subject.value,'My subject');assert.equal(form.elements.body.value,'My carefully written message\n\nTemplate text');undo();assert.equal(form.elements.body.value,'My carefully written message');
 form.dataset.thread='thread';const revert=applyComposeTemplate(form,{subject:'Wrong reply subject',body:'Replacement'});assert.equal(form.elements.subject.value,'My subject');assert.equal(form.elements.body.value,'Replacement');revert();assert.equal(form.elements.body.value,'My carefully written message');
});
async function harness(kind,failedResponse){
 const oldDocument=globalThis.document,oldFetch=globalThis.fetch,oldLocation=globalThis.location;
 const calls=[],screens=[],messages=[];const record={id:'record-1',to:'client@example.com',subject:'Update',body:'Hello',typeName:'Meeting',contactEmail:'client@example.com',start:'2027-01-01T10:00:00Z',end:'2027-01-01T10:30:00Z'};
 globalThis.document={addEventListener(){}};globalThis.location={hash:'#messages'};
 globalThis.fetch=async(url,options)=>{const body=options.body?JSON.parse(options.body):null;calls.push(body?.action||'status');if(!body)return Response.json({connection:{provider:'nylas',account:{email:'owner@example.com',gmail:true,calendar:true}},operations:[],threads:[]});if(body.action==='preview')return Response.json({record,hash:'reviewed-hash'});if(body.action==='send'||body.action==='calendar-event'){if(failedResponse)return Response.json({error:'Review changed details'}, {status:409});throw Error('Connection interrupted');}if(body.action==='calendar-check')return Response.json({status:'not-created'});throw Error('Unexpected action '+body.action);};
 const dialog={querySelector:()=>null,close(){screens.push({title:'closed'});}};
 const ui=createCommunicationsUI({getState:()=>({clients:[],projects:[]}),getPage:()=>'',open:(title,html,options)=>screens.push({title,html,footer:options?.footer}),dialog,btn:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`,icon:()=>'',esc:x=>String(x??''),save:async()=>{},render(){},toast:x=>messages.push(x),go(){},blocked:()=>false});
 try{ui.handleClick(kind==='email'?'mail-review':'mail-calendar-review',{dataset:{id:record.id}});await flush();ui.handleClick(kind==='email'?'mail-send':'mail-calendar-create',{dataset:{id:record.id},disabled:false});await flush();return {ui,calls,screens,messages,restore(){globalThis.document=oldDocument;globalThis.fetch=oldFetch;globalThis.location=oldLocation;}};}catch(error){globalThis.document=oldDocument;globalThis.fetch=oldFetch;globalThis.location=oldLocation;throw error;}
}
for(const kind of ['email','calendar'])test(`${kind} unknown dispatch exposes a status check and never retries dispatch`,async()=>{
 const h=await harness(kind);try{assert.match(h.screens.at(-1).footer,kind==='email'?/mail-check/:/mail-calendar-check/);assert.doesNotMatch(h.screens.at(-1).footer,/data-action="mail-send"|data-action="mail-calendar-create"/);h.ui.handleClick(kind==='email'?'mail-check':'mail-calendar-check',{dataset:{id:'record-1'}});await flush();assert.equal(h.calls.filter(x=>x===(kind==='email'?'send':'calendar-event')).length,1);assert.match(h.screens.at(-1).html,/not confirmed|unconfirmed/);}finally{h.restore();}
});
test('a definite rejected request with no receipt returns to review after checking status',async()=>{
 const h=await harness('email',true);try{h.ui.handleClick('mail-check',{dataset:{id:'record-1'}});await flush();assert.equal(h.screens.at(-1).title,'Review email');assert.equal(h.calls.filter(x=>x==='send').length,1);assert.match(h.messages.at(-1),/rejected before a send attempt/);}finally{h.restore();}
});
