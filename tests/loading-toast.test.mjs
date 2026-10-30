import test from 'node:test';
import assert from 'node:assert/strict';
import {loadingToast} from '../public/loading-toast.js';
import {createNotificationsUI} from '../public/notifications-ui.js';

for(const fail of [false,true])test(`email loading toast cleans up on ${fail?'failure':'success'}`,async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const nodes=[];
 const element=()=>({children:[],setAttribute(){},addEventListener(){},append(...items){this.children.push(...items);for(const item of items)item.parent=this;},remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);},get childElementCount(){return this.children.length;}});
 const body=element();
 const original={document:globalThis.document,fetch:globalThis.fetch,setInterval:globalThis.setInterval};
 globalThis.document={body,createElement(){const n=element();nodes.push(n);return n;},querySelector(){return body.children.find(n=>n.id==='loading-toasts');}};
 globalThis.setInterval=()=>0;
 let finish,calls=0;
 globalThis.fetch=()=>{calls++;return new Promise((resolve,reject)=>{finish=()=>fail?reject(Error('Offline')):resolve({ok:true,json:async()=>({threads:[],connection:{}})});});};
 try{
  const ui=createNotificationsUI({getState:()=>({}),getPage:()=>'',render(){}});
  ui.click('notifications-refresh');ui.click('notifications-refresh');
  assert.equal(calls,1);assert.equal(body.children[0].children.length,1);
  assert.equal(body.children[0].children[0].children[1].textContent,'Checking email updates…');
  finish();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(body.children.length,1);
  t.mock.timers.tick(180);
  assert.equal(body.children.length,0);
 }finally{Object.assign(globalThis,original);}
});

test('dismissing one loading toast leaves concurrent work visible and is idempotent',(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const element=()=>({children:[],attributes:{},setAttribute(key,value){this.attributes[key]=value;},addEventListener(){},append(...items){this.children.push(...items);for(const item of items)item.parent=this;},remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);},get childElementCount(){return this.children.length;}});
 const body=element(),original=globalThis.document;
 globalThis.document={body,createElement:element,querySelector:()=>body.children.find(n=>n.id==='loading-toasts')};
 try{
  const first=loadingToast('First request'),second=loadingToast('Second request');
  first();first();
  assert.equal(body.children[0].children.length,2);
  assert.equal(body.children[0].children[0].attributes['aria-hidden'],'true');
  t.mock.timers.tick(180);
  assert.equal(body.children[0].children.length,1);
  assert.equal(body.children[0].children[0].children[1].textContent,'Second request');
  second();t.mock.timers.tick(180);
  assert.equal(body.children.length,0);
 }finally{globalThis.document=original;}
});
