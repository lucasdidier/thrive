import test from 'node:test';
import assert from 'node:assert/strict';
import {navigateActionMenu} from '../public/menu-keyboard.js';

function fixture(){
 let focused='',closed=false;
 const item=(name,{disabled=false,hidden=false}={})=>({textContent:name,disabled,getAttribute:()=>null,getClientRects:()=>hidden?[]:[{}],closest:s=>s==='button,a[href]'?items.find(i=>i.textContent===name):null,focus(){focused=name;}});
 const items=[item('Project'),item('Unavailable',{disabled:true}),item('Hidden',{hidden:true}),item('Invoice'),item('Import'),item('Time entry')];
 const panel={querySelectorAll:()=>items},trigger={focus(){focused='trigger';}},options={trigger,close(){closed=true;}};
 function key(key,target=items[0],extra={}){const event={key,target,preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...extra};return navigateActionMenu(event,panel,options);}
 return {key,items,get focused(){return focused;},get closed(){return closed;}};
}
test('action menus skip hidden and disabled items and wrap in both directions',()=>{
 const f=fixture();f.key('ArrowDown');assert.equal(f.focused,'Invoice');f.key('ArrowUp');assert.equal(f.focused,'Time entry');
 f.key('End');assert.equal(f.focused,'Time entry');f.key('Home',f.items[5]);assert.equal(f.focused,'Project');
});
test('typeahead cycles matching actions and Escape returns focus without activating anything',()=>{
 const f=fixture();f.key('i');assert.equal(f.focused,'Invoice');f.key('i',f.items[3]);assert.equal(f.focused,'Import');
 f.key('Escape',f.items[4]);assert.equal(f.closed,true);assert.equal(f.focused,'trigger');
});
test('text editing, composition and modified shortcuts are not captured by menus',()=>{
 const f=fixture();assert.equal(f.key('Home',{closest:()=>({})}),false);
 assert.equal(f.key('i',f.items[0],{isComposing:true}),false);
 assert.equal(f.key('a',f.items[0],{metaKey:true}),false);assert.equal(f.focused,'');
});
