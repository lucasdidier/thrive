import test from 'node:test';
import assert from 'node:assert/strict';
import {createDialogDraftGuard,draftSnapshot} from '../public/dialog-draft-guard.js';

function harness(){
 const listeners={};globalThis.window={addEventListener:(type,fn)=>listeners['window:'+type]=fn};
 let fields=[{name:'title',type:'text',value:'Original',closest:()=>null,matches:()=>false}];
 const form={id:'editor',dataset:{id:'draft-1'}};
 const dialog={open:true,querySelector:()=>form,querySelectorAll:()=>fields,addEventListener:(type,fn)=>listeners[type]=fn};
 let allow=false,asked=0;
 const guard=createDialogDraftGuard(dialog,{confirmDiscard:()=>{asked++;return allow;}});
 return {guard,dialog,form,listeners,get fields(){return fields;},set fields(value){fields=value;},get asked(){return asked;},allow(){allow=true;}};
}
test('unchanged editors close without prompting; changes and reversions are detected',async()=>{
 const h=harness();h.guard.track();await Promise.resolve();assert.equal(h.guard.canLeave(),true);assert.equal(h.asked,0);
 h.fields[0].value='Edited';assert.equal(h.guard.canLeave(),false);assert.equal(h.guard.dirty(),true);
 h.fields[0].value='Original';assert.equal(h.guard.dirty(),false);
});
test('redrawing the same editor keeps its original baseline',async()=>{
 const h=harness();h.guard.track();await Promise.resolve();h.fields=[{...h.fields[0],value:'Changed'}];h.guard.track();await Promise.resolve();
 assert.equal(h.guard.dirty(),true);h.allow();assert.equal(h.guard.canLeave(),true);
});
test('Escape and unload preserve drafts; successful close resets tracking',async()=>{
 const h=harness();h.guard.track();await Promise.resolve();h.fields[0].value='Changed';let prevented=0;
 h.listeners.cancel({preventDefault(){prevented++;}});h.listeners['window:beforeunload']({preventDefault(){prevented++;}});assert.equal(prevented,2);
 h.dialog.open=false;h.listeners.close();h.dialog.open=true;h.guard.track();await Promise.resolve();assert.equal(h.guard.dirty(),false);
});
test('checkbox states and row structure count, transient Fluid controls do not',()=>{
 const h=harness();h.fields.push({...h.fields[0],name:'enabled',type:'checkbox',value:'on',checked:false});const before=draftSnapshot(h.dialog);
 h.fields[1].checked=true;assert.notEqual(draftSnapshot(h.dialog),before);h.fields[1].checked=false;
 h.fields.push({...h.fields[0],closest:()=>({})});assert.equal(draftSnapshot(h.dialog),before);
 h.fields.push({...h.fields[0],name:'line'});assert.notEqual(draftSnapshot(h.dialog),before);
});
test('multiselect changes beyond the first selected option are dirty',async()=>{
 const h=harness();h.fields=[{name:'tags',type:'select-multiple',multiple:true,value:'a',selectedOptions:[{value:'a'}],closest:()=>null,matches:()=>false}];
 h.guard.track();await Promise.resolve();h.fields[0].selectedOptions.push({value:'b'});assert.equal(h.guard.dirty(),true);assert.equal(h.guard.canLeave(),false);
});
test('a freshly opened editor can reset a previous same-key baseline before the delayed close event',async()=>{
 const h=harness();h.guard.track();await Promise.resolve();h.fields[0].value='Saved content';
 // app.open clears synchronously whenever it opens a closed native dialog.
 h.dialog.open=false;h.guard.clear();h.dialog.open=true;h.guard.track();await Promise.resolve();
 h.listeners.close();assert.equal(h.guard.dirty(),false);h.fields[0].value='New unsaved content';assert.equal(h.guard.dirty(),true);
});
