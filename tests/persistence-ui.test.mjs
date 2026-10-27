import test from 'node:test';
import assert from 'node:assert/strict';
import {createPersistenceUI} from '../public/persistence-ui.js';
import {createSettingsUI} from '../public/settings-ui.js';
import {emptyWorkspace} from '../server/account-workspace.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function surface(id='form'){
 const error={textContent:''},button={disabled:false,isConnected:true},attributes={};
 return {id,dataset:{},isConnected:true,error,button,attributes,querySelector:()=>error,querySelectorAll:()=>[button],setAttribute:(k,v)=>attributes[k]=v,removeAttribute:k=>delete attributes[k]};
}
test('completion waits for persistence and duplicate submissions are suppressed',async()=>{
 const request=deferred(),form=surface();let mutations=0,completed=0;
 const persist=createPersistenceUI({save:()=>request.promise});
 const first=persist(form,()=>++mutations,()=>completed++,{form:true});
 await persist(form,()=>++mutations,()=>completed++,{form:true});
 assert.equal(mutations,1);assert.equal(completed,0);assert.equal(form.button.disabled,true);
 request.resolve();await first;
 assert.equal(completed,1);assert.equal(form.button.disabled,false);assert.equal(form.attributes['aria-busy'],undefined);
});
test('resolved but blocked persistence retains form and reports recovery instead of success',async()=>{
 const form=surface();let blocked=false,completed=0;
 const persist=createPersistenceUI({save:async()=>{blocked=true;},blocked:()=>blocked});
 await persist(form,()=>{},()=>completed++,{form:true});
 assert.equal(completed,0);assert.match(form.error.textContent,/not synced/);assert.equal(form.button.disabled,false);
 let mutation=false;await persist(form,()=>mutation=true,()=>completed++,{form:true});
 assert.equal(mutation,false);
});
test('failed destructive action retries saving without applying the mutation twice',async()=>{
 const source=surface();let attempts=0,mutations=0,completed=0;
 const persist=createPersistenceUI({save:async()=>{if(++attempts===1)throw Error('Offline');}});
 await persist(source,()=>++mutations,()=>completed++);
 assert.match(source.error.textContent,/Offline/);assert.equal(completed,0);
 await persist(source,()=>++mutations,()=>completed++);
 assert.equal(mutations,1);assert.equal(completed,1);
});
test('record creation dispatch remains synchronous, waits, and retries without duplicate clients',async()=>{
 const state=emptyWorkspace({name:'Alex',email:'alex@example.com'}),form=surface('record-client-form');
 let request=deferred(),closes=0,details=0;const messages=[];
 const ui=createSettingsUI({getState:()=>state,save:()=>request.promise,blocked:()=>false,render(){},dialog:{close(){closes++;}},toast:m=>messages.push(m),tags:{read:()=>[]},clientDetail(){details++;}});
 const values={name:'New client',email:'new@example.com',type:'individual'};
 assert.equal(ui.handleSubmit(form,values),true);assert.equal(state.clients.length,1);assert.equal(closes,0);
 request.reject(Error('Offline'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(closes,0);assert.equal(details,0);assert.deepEqual(messages,[]);assert.match(form.error.textContent,/Offline/);
 request=deferred();assert.equal(ui.handleSubmit(form,{...values,name:'Edited client'}),true);assert.equal(state.clients.length,1);
 request.resolve();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(state.clients[0].name,'Edited client');assert.equal(closes,1);assert.equal(details,1);assert.deepEqual(messages,['Client saved.']);
});
