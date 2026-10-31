import test from 'node:test';
import assert from 'node:assert/strict';
import {installInlineEditing,cancelInlineEdit} from '../public/inline-edit.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function harness(){
 const listeners={},calls={submit:0,focus:0};
 const outside={isConnected:true,closest:()=>null};
 const host={dataset:{inlineOriginal:'Saved value'},querySelector:()=>({focus(){calls.focus++;}}),set innerHTML(value){this.restored=value;form.isConnected=false;}};
 const form={isConnected:true,parentElement:host,contains:el=>el===form,requestSubmit(){calls.submit++;},closest:selector=>selector.includes('#rp-inline-form')?form:null};
 const doc={activeElement:outside,addEventListener:(name,fn)=>listeners[name]=fn,querySelector:()=>form.isConnected?form:null};
 installInlineEditing(doc);
 const click=(target=outside)=>{const event={target,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};listeners.click(event);return event;};
 return {doc,form,host,outside,calls,listeners,click};
}
test('outside click cancels synchronously, submits nothing and lets the original action continue',()=>{
 const h=harness(),event=h.click();assert.equal(h.host.restored,'Saved value');assert.equal(h.form.isConnected,false);assert.equal(h.outside.isConnected,true);assert.equal(h.calls.submit,0);assert.equal(event.prevented,undefined);assert.equal(event.stopped,undefined);assert.equal(h.host.dataset.inlineOriginal,undefined);
});
test('save/cancel controls inside the editor and portalled choices retain the current edit',()=>{
 const h=harness();h.click(h.form);h.click({closest:()=>({})});assert.equal(h.form.isConnected,true);assert.equal(h.calls.submit,0);
});
test('keyboard focus leaving cancels without moving focus back or saving',async()=>{
 const h=harness();h.listeners.focusout({target:h.form,relatedTarget:h.outside});await tick();assert.equal(h.form.isConnected,false);assert.equal(h.calls.focus,0);assert.equal(h.calls.submit,0);
});
test('temporary select focus loss and moving between internal controls preserve the edit',async()=>{
 const h=harness();h.listeners.focusout({target:h.form,relatedTarget:null});await tick();assert.equal(h.form.isConnected,true);
 h.doc.activeElement=h.form;h.listeners.focusout({target:h.form,relatedTarget:h.form});await tick();assert.equal(h.form.isConnected,true);
});
test('Escape cancels and restores focus to the original field; installing twice is harmless',()=>{
 const h=harness(),click=h.listeners.click;installInlineEditing(h.doc);assert.equal(h.listeners.click,click);const event={key:'Escape',target:h.form,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};h.listeners.keydown(event);assert.equal(event.prevented,true);assert.equal(event.stopped,true);assert.equal(h.calls.focus,1);assert.equal(h.calls.submit,0);assert.equal(cancelInlineEdit(h.doc),false);
});
