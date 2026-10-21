import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotificationsUI} from '../public/notifications-ui.js';

for(const fail of [false,true])test(`email loading toast cleans up on ${fail?'failure':'success'}`,async()=>{
 const nodes=[];
 const element=()=>({children:[],setAttribute(){},append(...items){this.children.push(...items);for(const item of items)item.parent=this;},remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);},get childElementCount(){return this.children.length;}});
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
  assert.equal(body.children.length,0);
 }finally{Object.assign(globalThis,original);}
});
