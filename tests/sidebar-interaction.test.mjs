import test from 'node:test';
import assert from 'node:assert/strict';
import {initSidebarUI} from '../public/sidebar-ui.js';

test('collapsed navigation keeps its first click; only blank space and the toggle expand',()=>{
 const original={document:globalThis.document,localStorage:globalThis.localStorage,matchMedia:globalThis.matchMedia};
 const listeners={},root={dataset:{}},button={setAttribute(){}};
 globalThis.document={documentElement:root,querySelector:()=>button,addEventListener(type,fn){listeners[type]=fn;}};
 globalThis.localStorage={getItem:()=> 'true',setItem(){}};
 globalThis.matchMedia=()=>({matches:true});
 try{
  initSidebarUI('audit');
  const click=(kind)=>{
   let prevented=false,stopped=false;
   listeners.click({target:{closest(selector){if(selector==='[data-sidebar-toggle]')return kind==='toggle'?button:null;if(selector==='#sidebar')return root;if(selector==='a,button,input,select,textarea,summary,[role=button]')return kind==='link'?{}:null;return null;}},preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
   return {prevented,stopped};
  };
  assert.deepEqual(click('link'),{prevented:false,stopped:false});
  assert.equal(root.dataset.sidebarCollapsed,'true');
  assert.deepEqual(click('blank'),{prevented:true,stopped:true});
  assert.equal(root.dataset.sidebarCollapsed,'false');
  click('toggle');assert.equal(root.dataset.sidebarCollapsed,'true');
 }finally{Object.assign(globalThis,original);}
});


test('hover previews a collapsed sidebar without changing the saved preference',()=>{
 const original={document:globalThis.document,localStorage:globalThis.localStorage,matchMedia:globalThis.matchMedia};
 const listeners={},root={dataset:{}},writes=[],sidebar={addEventListener(type,fn){listeners[type]=fn;}};
 globalThis.document={documentElement:root,querySelector:()=>null,getElementById:()=>sidebar,addEventListener(){}};
 globalThis.localStorage={getItem:()=> 'true',setItem:(...args)=>writes.push(args)};
 globalThis.matchMedia=()=>({matches:true});
 try{initSidebarUI('hover');listeners.pointerenter({pointerType:'mouse'});assert.equal(root.dataset.sidebarCollapsed,'true');assert.equal(root.dataset.sidebarPeek,'true');listeners.pointerleave();assert.equal(root.dataset.sidebarCollapsed,'true');assert.equal(root.dataset.sidebarPeek,'false');assert.equal(writes.length,0);listeners.pointerenter({pointerType:'touch'});assert.equal(root.dataset.sidebarCollapsed,'true');}finally{Object.assign(globalThis,original);}
});


test('hover exit keeps an open menu visible and keyboard focus reveals clipped controls',()=>{
 const original={document:globalThis.document,localStorage:globalThis.localStorage,matchMedia:globalThis.matchMedia};
 const listeners={},root={dataset:{}},control={},outside={};let menuOpen=false;
 const sidebar={addEventListener(type,fn){listeners[type]=fn;},contains(node){return node===control;}};
 globalThis.document={documentElement:root,activeElement:outside,querySelector:()=>menuOpen?{}:null,getElementById:()=>sidebar,addEventListener(){}};
 globalThis.localStorage={getItem:()=> 'true',setItem(){throw new Error('Preview must not persist');}};
 globalThis.matchMedia=()=>({matches:true});
 try{
  initSidebarUI('hover');
  listeners.pointerenter({pointerType:'mouse'});menuOpen=true;listeners.pointerleave();
  assert.equal(root.dataset.sidebarPeek,'true');
  menuOpen=false;listeners.pointerleave();assert.equal(root.dataset.sidebarPeek,'false');
  root.dataset.inputModality='keyboard';document.activeElement=control;listeners.focusin();
  assert.equal(root.dataset.sidebarPeek,'true');
  listeners.pointerleave();assert.equal(root.dataset.sidebarPeek,'true');
  listeners.focusout({relatedTarget:outside});assert.equal(root.dataset.sidebarPeek,'false');
  assert.equal(root.dataset.sidebarCollapsed,'true');
  root.dataset.inputModality='keyboard';listeners.pointerenter({pointerType:'mouse'});
  assert.equal(root.dataset.inputModality,'pointer');
 }finally{Object.assign(globalThis,original);}
});
