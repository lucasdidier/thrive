import test from 'node:test';
import assert from 'node:assert/strict';
import {createSidebarMotion} from '../public/sidebar-motion.js';

function fixture(run){
 const original={document:globalThis.document,matchMedia:globalThis.matchMedia,getComputedStyle:globalThis.getComputedStyle};
 const root={dataset:{inputModality:'pointer'}},calls=[];
 let x=228,width=220,paintedX=null,scale=1,allowed=true;
 const animate=(frames,options)=>{const a={frames,options,cancelled:false,finished:new Promise(()=>{}),cancel(){this.cancelled=true;paintedX=null;scale=1;}};calls.push(a);return a;};
 const sidebar={animate},workspace={animate,getBoundingClientRect:()=>({left:paintedX??x,top:0})};
 globalThis.document={getElementById:()=>sidebar,querySelectorAll:()=>[workspace]};
 globalThis.matchMedia=()=>({matches:allowed});
 globalThis.getComputedStyle=el=>el===root?{getPropertyValue:n=>n==='--duration-sidebar'?'260ms':'cubic-bezier(.32,.72,0,1)'}:{width:String(width),transform:`matrix(${scale}, 0, 0, 1, 0, 0)`};
 const motion=createSidebarMotion(root);
 try{run({motion,root,calls,layout:(left,w)=>{x=left;width=w;},paint:(left,s)=>{paintedX=left;scale=s;},disable:()=>{allowed=false;}});}finally{Object.assign(globalThis,original);}
}

test('rapid reversal begins at the painted position and cancels the old motion',()=>fixture(({motion,calls,layout,paint})=>{
 motion.run(()=>layout(64,56));
 assert.equal(calls[0].frames[0].transform,'translate(164px,0px)');
 assert.equal(calls[1].options.pseudoElement,'::before');
 paint(120,2);
 motion.run(()=>layout(228,220));
 assert.ok(calls[0].cancelled&&calls[1].cancelled);
 assert.equal(calls[2].frames[0].transform,'translate(-108px,0px)');
 assert.equal(calls[3].frames[0].transform,`scaleX(${112/220})`);
 assert.ok(calls.every(a=>a.options.duration===260));
}));

test('keyboard, reduced motion and mobile commit immediately and clear active motion',()=>fixture(({motion,root,calls,layout,disable})=>{
 motion.run(()=>layout(64,56));
 root.dataset.inputModality='keyboard';let committed=false;
 motion.run(()=>{committed=true;layout(228,220);});
 assert.ok(committed);assert.equal(calls.length,2);assert.ok(calls.every(a=>a.cancelled));
 root.dataset.inputModality='pointer';disable();
 motion.run(()=>layout(64,56));assert.equal(calls.length,2);
}));
