import test from 'node:test';
import assert from 'node:assert/strict';
import {installInlineAutosave} from '../public/inline-autosave.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
function harness({valid=true,success=true,delay=false}={}){
 const listeners={},calls={submit:0,click:0,focus:0},control={tagName:'BUTTON',textContent:'Next field',attributes:[{name:'data-action',value:'rp-edit'}],getAttribute:()=> 'rp-edit',isConnected:true,closest(selector){return selector.startsWith('button,')?this:null;},focus(){calls.focus++;},click(){calls.click++;}};
 let resolve;
 const saved=delay?new Promise(r=>resolve=r):Promise.resolve(success);
 const form={isConnected:true,contains:el=>el===form,reportValidity:()=>valid,requestSubmit(){calls.submit++;this.inlineSave=saved.then(ok=>{if(ok){this.isConnected=false;control.isConnected=false;}return ok;});},getAttribute:()=>null};
 const replacement={...control,isConnected:true};
 const doc={activeElement:control,addEventListener:(name,fn)=>listeners[name]=fn,querySelector:()=>form.isConnected?form:null,querySelectorAll:()=>[replacement]};
 installInlineAutosave(doc);
 const click=(target=control)=>{const event={target,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};listeners.click(event);return event;};
 return {calls,form,control,click,listeners,resolve};
}
test('outside action waits for persistence and finds its replacement after rendering',async()=>{
 const h=harness({delay:true});const event=h.click();
 assert.equal(event.prevented,true);assert.equal(h.calls.submit,1);assert.equal(h.calls.click,0);
 h.click();assert.equal(h.calls.submit,1);
 h.resolve(true);await tick();assert.equal(h.calls.click,1);assert.equal(h.calls.focus,1);
});
test('invalid input or failed persistence keeps the outside action from running',async()=>{
 for(const options of [{valid:false},{success:false}]){const h=harness(options);h.click();await tick();assert.equal(h.calls.click,0);assert.equal(h.form.isConnected,true);}
});
test('internal controls and portalled selectors do not trigger autosave',async()=>{
 const h=harness();h.click(h.form);h.click({closest:()=>({})});await tick();assert.equal(h.calls.submit,0);
});
test('enhancing a native select must not autosave when browser focus is temporarily cleared',async()=>{
 const h=harness();h.listeners.focusout({target:{closest:()=>h.form},relatedTarget:null});await tick();assert.equal(h.calls.submit,0);
});
test('keyboard focus leaving the editor saves the value',async()=>{
 const h=harness();h.listeners.focusout({target:{closest:()=>h.form},relatedTarget:h.control});await tick();assert.equal(h.calls.submit,1);assert.equal(h.calls.focus,1);assert.equal(h.calls.click,0);
});
