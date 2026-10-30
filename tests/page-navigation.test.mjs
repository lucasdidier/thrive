import test from 'node:test';
import assert from 'node:assert/strict';
import {resetPagePosition} from '../public/page-navigation.js';

test('route navigation resets page and content scroll without focus scrolling past the header',t=>{
 const calls=[];
 const main={focus:options=>calls.push(['focus',options]),scrollTo:options=>calls.push(['main',options])};
 const previous={document:globalThis.document,window:globalThis.window};
 globalThis.document={querySelector:()=>main};globalThis.window={scrollTo:options=>calls.push(['window',options])};
 t.after(()=>Object.assign(globalThis,previous));
 resetPagePosition();
 assert.deepEqual(calls,[['focus',{preventScroll:true}],['main',{top:0,left:0,behavior:'instant'}],['window',{top:0,left:0,behavior:'instant'}]]);
 calls.length=0;resetPagePosition({focus:false});
 assert.deepEqual(calls.map(([target])=>target),['main','window']);
});
