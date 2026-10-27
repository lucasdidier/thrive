import test from 'node:test';
import assert from 'node:assert/strict';
import {editorContext} from '../public/editor-context.js';
import {createRecordPanel} from '../public/record-panel-ui.js';
import {createTimeUI} from '../public/time-ui.js';
import {seed,initBilling,createProject} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';

const control=attrs=>({getAttribute:key=>attrs[key]??null,hasAttribute:key=>key in attrs,selectionStart:2,selectionEnd:4,focus(){this.focused=true;},setSelectionRange(a,b){this.range=[a,b];}});
test('editor redraw restores disclosure, caret, focus and scroll without replacing new values',()=>{
 const oldInput=control({name:'title'}),newInput=control({name:'title'}),oldDetails={className:'appearance',open:true},newDetails={className:'appearance',open:false};
 let container={contains:el=>el===oldInput,querySelectorAll:()=>[oldDetails]};
 const root={scrollTop:420,ownerDocument:{activeElement:oldInput},querySelector:()=>container};
 const restore=editorContext(root,'#editor');
 container={querySelectorAll:selector=>selector==='details'?[newDetails]:[newInput]};root.scrollTop=0;restore();
 assert.equal(newDetails.open,true);assert.equal(newInput.focused,true);assert.deepEqual(newInput.range,[2,4]);assert.equal(root.scrollTop,420);
});
test('editor redraw tolerates a removed focused control',()=>{
 const active=control({'data-option':'deleted'});let container={contains:()=>true,querySelectorAll:()=>[]};
 const root={scrollTop:10,ownerDocument:{activeElement:active},querySelector:()=>container};const restore=editorContext(root,'#editor');
 container={querySelectorAll:()=>[]};assert.doesNotThrow(restore);
});
function timeHarness(){
 globalThis.document={addEventListener(){}};
 const state=initBilling(upgradeWorkspace(seed()));
 const a=createProject(state,{clientId:state.clients[0].id,name:'Billable project',budget:10000});a.hourlyRate=5000;a.billable=true;
 const b=createProject(state,{clientId:state.clients[0].id,name:'Nonbillable project',budget:10000});b.hourlyRate=0;b.billable=false;
 const rate={value:'50'},billable={checked:true},status={textContent:''};let closed=0,toasts=[],blocked=false,resolveSave;
 const dialog={querySelector:sel=>sel==='[name="rate"]'?rate:sel==='[name="billable"]'?billable:sel==='[data-time-default-status]'?status:null,close(){closed++;}};
 const ui=createTimeUI({getState:()=>state,dialog,blocked:()=>blocked,save:()=>new Promise(r=>resolveSave=r),render(){},toast:m=>toasts.push(m)});
 return {ui,state,a,b,rate,billable,status,get closed(){return closed;},toasts,finish(failed=false){blocked=failed;resolveSave();}};
}
test('changing time project applies zero rate and nonbillable defaults until overridden',()=>{
 const h=timeHarness();const field=(name,value)=>({name,value,dataset:{},closest:()=>true});
 h.ui.handleChange(field('projectId',h.b.id));assert.equal(h.rate.value,0);assert.equal(h.billable.checked,false);
 h.rate.value='75';h.ui.handleChange(field('rate','75'));h.billable.checked=true;h.ui.handleChange(field('billable','on'));
 h.ui.handleChange(field('projectId',h.a.id));assert.equal(h.rate.value,'75');assert.equal(h.billable.checked,true);
});
test('time save keeps editor open until acknowledged and never reports blocked save as success',async()=>{
 const h=timeHarness(),form={id:'time-entry-form',dataset:{},elements:{billable:{checked:true}}};
 assert.equal(h.ui.handleSubmit(form,{projectId:h.a.id,hours:'1',minutes:'0',rate:'50',date:'2026-10-27',note:'Audit task'}),true);
 assert.equal(h.closed,0);assert.deepEqual(h.toasts,[]);assert.ok(form.dataset.id);
 h.finish(true);await new Promise(r=>setImmediate(r));assert.equal(h.closed,0);assert.deepEqual(h.toasts,[]);
});
test('acknowledged time save closes and reports success once',async()=>{
 const h=timeHarness(),form={id:'time-entry-form',dataset:{},elements:{billable:{checked:true}}};
 h.ui.handleSubmit(form,{projectId:h.a.id,hours:'1',minutes:'0',rate:'50',date:'2026-10-27',note:'Audit task'});
 h.finish();await new Promise(r=>setImmediate(r));assert.equal(h.closed,1);assert.deepEqual(h.toasts,['Time entry saved.']);
 assert.equal(h.ui.handleSubmit({id:'unrelated'},{}),false);
});

test('editor context distinguishes repeated disclosures and identical fields in separate line items',()=>{
 const first=control({'data-item':'rate'}),second=control({'data-item':'rate'}),firstNew=control({'data-item':'rate'}),secondNew=control({'data-item':'rate'});
 const row1=control({'data-line-index':'0'}),row2=control({'data-line-index':'1'});first.parentElement=row1;second.parentElement=row2;firstNew.parentElement=row1;secondNew.parentElement=row2;
 const details=[{className:'expandable-card',open:false},{className:'expandable-card',open:true}],nextDetails=details.map(d=>({...d,open:false}));
 const scroller={className:'invoice-workbench',scrollTop:300,scrollLeft:50},nextScroller={className:'invoice-workbench',scrollTop:0,scrollLeft:0};
 let container={contains:()=>true,querySelectorAll:s=>s==='details'?details:s==='*'?[scroller]:[first,second]};
 const root={scrollTop:10,ownerDocument:{activeElement:second},querySelector:()=>container};const restore=editorContext(root,'#invoice');
 container={querySelectorAll:s=>s==='details'?nextDetails:s==='*'?[nextScroller]:[firstNew,secondNew]};restore();
 assert.deepEqual(nextDetails.map(d=>d.open),[false,true]);assert.equal(firstNew.focused,undefined);assert.equal(secondNew.focused,true);assert.equal(nextScroller.scrollTop,300);assert.equal(nextScroller.scrollLeft,50);
});
test('inline record edit blocks panel close, record navigation and Escape until explicit cancel/save',()=>{
 const messages=[];let navigated=false,prevented=false;
 globalThis.document={addEventListener(){},querySelector:()=>({id:'rp-inline-form'})};
 const panel=createRecordPanel({dialog:{open:false},toast:m=>messages.push(m),detail(){navigated=true;}});
 assert.equal(panel.handleClick('rp-close',{}),true);
 assert.equal(panel.handleClick('rp-navigate',{dataset:{entity:'client',id:'c2'}}),true);
 assert.equal(panel.keyboard({key:'Escape',preventDefault(){prevented=true;}}),true);
 assert.equal(navigated,false);assert.equal(prevented,true);assert.equal(messages.length,3);
});

test('workspace polling preserves blurred inline edits before and during refresh',async()=>{
 const {createWorkspaceSync}=await import('../public/workspace-sync.js');
 const original={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,fetch:globalThis.fetch,setInterval:globalThis.setInterval};
 try{
  let poll,editing='rp-inline-form',fetches=0,refreshes=0,resolveLatest;
  globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.window={addEventListener(){}};
  globalThis.document={addEventListener(){},hidden:false,body:{},activeElement:{matches:()=>false},querySelector:selector=>editing&&selector.includes('#'+editing)?{}:null};
  globalThis.setInterval=fn=>{poll=fn;};
  globalThis.fetch=async()=>{fetches++;return {ok:true,json:async()=>({revision:1})};};
  const sync=createWorkspaceSync({enabled:false});sync.bind(()=>({}),()=>{},()=>refreshes++);
  await poll();assert.equal(fetches,0);
  editing='cf-value-form';await poll();assert.equal(fetches,0);
  editing=null;
  globalThis.fetch=async()=>{fetches++;if(fetches===1)return {ok:true,json:async()=>({revision:2})};return new Promise(resolve=>resolveLatest=()=>resolve({ok:true,json:async()=>({revision:2,state:{}})}));};
  const pending=poll();while(!resolveLatest)await new Promise(r=>setImmediate(r));editing='rp-inline-form';resolveLatest();await pending;assert.equal(refreshes,0);
 }finally{Object.assign(globalThis,original);}
});

test('form required state updates appearance and a blocked new-form retry updates the same record',async()=>{
 const {createFormsUI}=await import('../public/forms-ui.js');
 const state=initBilling(upgradeWorkspace(seed())),before=state.forms.length,appearance={innerHTML:''},error={textContent:''};let mounted=false,blocked=true,required=true,mark=null;
 const heading={querySelector:()=>mark,append(el){mark=el;}};
 globalThis.document={addEventListener(){},createElement(){return {setAttribute(){},remove(){mark=null;}};}};
 const fieldValues={title:'Budget inquiry',intro:'',name:'',service:'Services',tag:''};
 const form={id:'fb-editor',elements:Object.fromEntries(Object.entries(fieldValues).map(([key,value])=>[key,{value}])),querySelectorAll:()=>[],querySelector:()=>error};
 const card={querySelector:selector=>selector==='[data-q=required]'?{checked:required}:selector==='[data-q="label"]'?{value:'Estimated budget'}:null};
 const dialog={addEventListener(){},classList:{add(){}},close(){},querySelector:selector=>selector==='#fb-editor'?(mounted?form:null):selector==='.fb-question-editor'?card:selector==='.form-design-preview'?appearance:null};
 const ui=createFormsUI({getState:()=>state,dialog,open(){mounted=true;},save:async()=>{},blocked:()=>blocked,render(){},toast(){},esc:String,icon:()=>'',btn:()=>''});
 ui.handleClick('ft-blank',{dataset:{}});
 const requiredControl={matches:()=>true,checked:true,closest:()=>({querySelector:()=>heading})};
 ui.handleChange(requiredControl);assert.match(appearance.innerHTML,/Estimated budget/);assert.match(appearance.innerHTML,/aria-label="required"/);assert.ok(mark);
 required=false;requiredControl.checked=false;ui.handleChange(requiredControl);assert.doesNotMatch(appearance.innerHTML,/aria-label="required"/);assert.equal(mark,null);
 ui.handleSubmit(form,'save');await new Promise(r=>setImmediate(r));assert.equal(error.textContent,'');assert.equal(state.forms.length,before+1);const savedId=state.forms.find(f=>f.title==='Budget inquiry').id;
 blocked=false;ui.handleSubmit(form,'save');await new Promise(r=>setImmediate(r));assert.equal(state.forms.length,before+1);assert.ok(state.forms.some(f=>f.id===savedId));
});

test('retrying a blocked new time entry updates its retained ID instead of adding another entry',async()=>{
 const h=timeHarness(),before=h.state.time.length,form={id:'time-entry-form',dataset:{},elements:{billable:{checked:true}}};
 const values={projectId:h.a.id,hours:'1',minutes:'0',rate:'50',date:'2026-10-27',note:'Retry task'};
 h.ui.handleSubmit(form,values);h.finish(true);await new Promise(r=>setImmediate(r));const id=form.dataset.id;
 h.ui.handleSubmit(form,values);h.finish(false);await new Promise(r=>setImmediate(r));assert.equal(h.state.time.length,before+1);assert.equal(form.dataset.id,id);
});
