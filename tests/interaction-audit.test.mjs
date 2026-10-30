import test from 'node:test';
import assert from 'node:assert/strict';
import {createNoteDrafts} from '../public/note-drafts.js';
import {recordSearchFields} from '../public/record-search.js';
import {requiresOnboarding} from '../public/onboarding-domain.js';
import {createRecordPanel} from '../public/record-panel-ui.js';

const memory=()=>{const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};};
test('note drafts survive record switches and reload independently of saved note data',()=>{
 const storage=memory(),drafts=createNoteDrafts('account-a',storage);
 drafts.write('client-a','','Draft A');drafts.write('client-b','note-b','Edited B','Saved B');
 drafts.select('client-a');
 const reload=createNoteDrafts('account-a',storage);
 assert.equal(reload.read('client-a'),'Draft A');assert.equal(reload.read('client-b','note-b'),'Edited B');
 assert.equal(reload.selected('client-b'),'note-b');
 assert.equal(createNoteDrafts('account-b',storage).read('client-a'),'');
 reload.clear('client-a');assert.equal(reload.has('client-a'),false);assert.equal(reload.has('client-b','note-b'),true);
});
test('reverting a note removes its dirty draft, and unavailable storage retains memory with unload protection',()=>{
 const drafts=createNoteDrafts('account',{getItem(){throw Error('Denied');},setItem(){throw Error('Full');}});
 drafts.write('c','n','Changed','Original');assert.equal(drafts.atRisk(),true);
 assert.equal(drafts.read('c','n','Original'),'Changed');
 drafts.write('c','n','Original','Original');assert.equal(drafts.has('c','n'),false);assert.equal(drafts.atRisk(),false);
});
test('invoice search retains number, title and linked client/project context',()=>{
 const state={clients:[{id:'c',name:'Solstice'}],projects:[{id:'p',clientId:'c',name:'Brand refresh'}]};
 const item=recordSearchFields(state,'invoices',{number:'INV-004',title:'Deposit',projectId:'p',status:'issued'});
 for(const query of ['INV-004','Deposit','Solstice','Brand refresh'])assert.ok([item.label,item.description,...item.keywords].join(' ').includes(query));
 assert.match(item.label,/INV-004/);assert.match(item.description,/Solstice · Brand refresh · issued/);
 const other=recordSearchFields({...state,clients:[{id:'c',name:'Another client'}]},'documents',{title:'Simple proposal',projectId:'p'});
 assert.match(other.description,/Another client/);
});
test('optional setup never blocks deep links while required onboarding remains gated',()=>{
 for(const step of ['profile','vertical'])assert.equal(requiresOnboarding({settings:{onboarding:{step}}}),true);
 for(const step of ['setup','complete'])assert.equal(requiresOnboarding({settings:{onboarding:{step}}}),false);
 assert.equal(requiresOnboarding({settings:{onboarding:{step:'profile',completedAt:'2026-10-28'}}}),false);
 assert.equal(requiresOnboarding({settings:{}}),false);
});
test('Escape closes a nested record menu before considering panel dismissal',()=>{
 const old=globalThis.document;let focused=false,prevented=false;
 const menu={open:true,querySelector:()=>({focus(){focused=true;}})};
 globalThis.document={addEventListener(){},querySelector:selector=>selector.includes('details[open]')?menu:null};
 try{
  const panel=createRecordPanel({dialog:{open:false}});
  assert.equal(panel.keyboard({key:'Escape',preventDefault(){prevented=true;}}),true);
  assert.equal(menu.open,false);assert.equal(focused,true);assert.equal(prevented,true);
 }finally{globalThis.document=old;}
});
