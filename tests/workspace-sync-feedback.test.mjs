import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceSync} from '../public/workspace-sync.js';
function setup(t){
 t.mock.timers.enable({apis:['setTimeout']});
 const original={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,fetch:globalThis.fetch,setInterval:globalThis.setInterval};
 const nodes=[],element=()=>({hidden:false,children:[],setAttribute(){},addEventListener(type,fn){this[type]=fn;},append(node){this.children.push(node);},replaceChildren(){this.children=[];}});
 globalThis.document={body:{dataset:{},append:el=>nodes.push(el),removeAttribute(){delete this.dataset.syncBusy;}},querySelector:selector=>selector==='#workspace-sync'?nodes[0]:null,createElement:element,addEventListener(){}};
 globalThis.window={addEventListener(){}};globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};globalThis.setInterval=()=>0;
 globalThis.fetch=async()=>Response.json({initialized:true,revision:0,state:{settings:{}}});
 const sync=createWorkspaceSync({enabled:false}),state={settings:{}};
 let resolve,reject;
 return {sync,state,nodes,async connect(){await sync.connect(state);sync.bind(()=>state,()=>{},()=>{});globalThis.fetch=()=>new Promise((a,b)=>{resolve=a;reject=b;});},succeed(){resolve(Response.json({revision:1,state}));},fail(){reject(Error('Connection lost.'));},restore(){Object.assign(globalThis,original);}};
}
test('fast saves never flash an empty or stale saving banner',async t=>{const h=setup(t);try{await h.connect();const save=h.sync.save();assert.equal(h.nodes[0].hidden,true);h.succeed();await save;t.mock.timers.tick(300);assert.equal(h.nodes[0].hidden,true);assert.equal(h.sync.isPending(),false);}finally{h.restore();}});
test('slow saves show a message then hide it when persistence completes',async t=>{const h=setup(t);try{await h.connect();const save=h.sync.save();t.mock.timers.tick(250);assert.equal(h.nodes[0].hidden,false);assert.equal(h.nodes[0].children[0].textContent,'Saving…');h.succeed();await save;t.mock.timers.tick(1000);assert.equal(h.nodes[0].hidden,true);assert.equal(h.sync.isPending(),false);}finally{h.restore();}});
test('a failed quick save shows recovery actions and cannot become a stale Saving message',async t=>{const h=setup(t);try{await h.connect();const save=h.sync.save();h.fail();await save;t.mock.timers.tick(1000);const banner=h.nodes[0];assert.equal(banner.hidden,false);assert.equal(banner.className,'sync-error');assert.match(banner.children[0].textContent,/Connection lost/);assert.deepEqual(banner.children.slice(1).map(b=>b.textContent),['Download my edits','Reload shared workspace','Retry save']);assert.equal(h.sync.isBlocked(),true);}finally{h.restore();}});
