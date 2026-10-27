import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogUI} from '../public/services-ui.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
for(const failed of [false,true])test(`catalog action ${failed?'retains failure state':'shows success only after acknowledgement'}`,async()=>{
 let acknowledge,opens=0,renders=0;const messages=[],field={textContent:''};const state={services:[{id:'service',name:'Consulting',kind:'service',items:[{quantity:1,rate:10000}],archived:false}]};
 const ui=createCatalogUI({getState:()=>state,open:()=>opens++,dialog:{querySelectorAll:()=>[],querySelector:()=>field},btn:()=>'',icon:()=>'',esc:String,save:()=>new Promise(resolve=>acknowledge=resolve),blocked:()=>failed,render:()=>renders++,toast:message=>messages.push(message)});
 assert.equal(ui.handleClick('service-archive',{dataset:{id:'service'}}),true);assert.equal(opens,0);assert.equal(messages.length,0);
 acknowledge();await flush();
 if(failed){assert.equal(opens,0);assert.equal(messages.length,0);assert.match(field.textContent,/not synced/);}else{assert.equal(opens,1);assert.equal(renders,1);assert.deepEqual(messages,['Service updated.']);}
});
