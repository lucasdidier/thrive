import test from 'node:test';
import assert from 'node:assert/strict';
import {queryList,groupRecords,viewDefaults} from '../public/list-view-domain.js';
import {createListViewUI} from '../public/list-view-ui.js';
import {createSelection} from '../public/bulk-domain.js';
import {seed} from '../public/domain.js';
import {upgradeWorkspace} from '../public/workspace-domain.js';
import {defaultConfig,saveCRMView,viewsFor} from '../public/crm-domain.js';

const fields=[{key:'name',label:'Name'},{key:'client',label:'Client',group:true,relationKey:'clientId'},{key:'date',label:'Date',type:'date',group:true},{key:'amount',label:'Amount'}];
test('filtered groups keep relation identities, counts, sorting and empty values without mutating records',()=>{
 const rows=[{id:'a',name:'Work A',client:'Studio',clientId:'1',amount:30},{id:'b',name:'Work B',client:'Studio',clientId:'2',amount:20},{id:'c',name:'Work C',client:'Studio',clientId:'1',amount:10},{id:'d',name:'Work D',client:'',amount:0},{id:'e',name:'Other',client:'Studio',clientId:'1',amount:50}],before=structuredClone(rows);
 const c={...viewDefaults(fields),sort:'amount',direction:'desc',groupBy:'client'};
 const result=groupRecords(queryList(rows,c,'work'),c,fields);
 assert.deepEqual(result.map(g=>g.rows.map(r=>r.id)),[['a','c'],['b'],['d']]);assert.deepEqual(result.map(g=>g.rows.length),[2,1,1]);assert.equal(result.at(-1).label,'No client');assert.deepEqual(rows,before);
});
test('date groups use stable calendar days and Monday weeks across month and year boundaries',()=>{
 const rows=['2026-12-31T23:00:00Z','2027-01-01T01:00:00Z','2027-01-04T09:00:00Z',null].map((date,id)=>({id,date}));
 const c={...viewDefaults(fields),groupBy:'date',groupGranularity:'week'};
 assert.deepEqual(groupRecords(rows,c,fields).map(g=>[g.label,g.rows.length]),[['Week of 2026-12-28',2],['Week of 2027-01-04',1],['No date',1]]);
 c.groupGranularity='month';assert.deepEqual(groupRecords(rows,c,fields).map(g=>g.label),['December 2026','January 2027','No date']);
 c.groupGranularity='day';assert.equal(groupRecords(rows,c,fields).length,4);
});
test('date ranges combine with custom field filters and include the full final day',()=>{
 const rows=[{date:'2026-10-01T00:00:00Z',score:10},{date:'2026-10-31T23:59:59Z',score:20},{date:'2026-11-01T00:00:00Z',score:30},{date:null,score:40}];
 const c={filters:{date:{op:'between',from:'2026-10-01',to:'2026-10-31'},score:{op:'gt',value:'15'}}};
 assert.deepEqual(queryList(rows,c),[rows[1]]);
});
test('grouping treats zero and false as values and unknown fields as an ungrouped view',()=>{
 const rows=[{flag:false},{flag:true},{flag:null},{flag:0}];const f=[{key:'flag',label:'Flag',group:true}];
 assert.deepEqual(groupRecords(rows,{groupBy:'flag'},f).map(g=>g.label),['0','false','true','No flag']);
 assert.equal(groupRecords(rows,{groupBy:'deleted'},f)[0].rows.length,4);
});
test('saved CRM views round trip grouping and date intervals with their other controls',()=>{
 const s=upgradeWorkspace(seed()),config={...defaultConfig('projects'),groupBy:'due',groupGranularity:'week',groupDirection:'desc',filters:{due:{op:'between',from:'2026-10-01',to:'2026-10-31'}}};
 const v=saveCRMView(s,'projects','Weekly delivery',config);assert.deepEqual(viewsFor(JSON.parse(JSON.stringify(s)),'projects').find(x=>x.id===v.id).config,config);
});
test('collapsing a group removes its records from bulk selection and keeps view totals intact',()=>{
 const selection=createSelection(),rows=[{id:'a',name:'A',client:'One',clientId:'1'},{id:'b',name:'B',client:'Two',clientId:'2'}],c={...viewDefaults(fields),groupBy:'client'};
 const ui=createListViewUI({render:()=>{},esc:String,icon:()=>'',bulk:{},dialog:{open:false}});ui.use({scope:'test',title:'Test',rows,columns:fields,config:c});
 selection.use('test',ui.visibleRows().map(r=>r.id));selection.start();selection.selectAll();
 ui.handleClick('view-group-toggle',{dataset:{group:ui.groups()[0].key}});
 selection.use('test',ui.visibleRows().map(r=>r.id));assert.deepEqual(selection.ids,['b']);assert.equal(ui.groups().flatMap(g=>g.rows).length,2);
});
test('context filters can be set before a list is opened and retain its default columns',()=>{
 const ui=createListViewUI({render:()=>{},esc:String,icon:()=>'',bulk:{},dialog:{open:false}});
 ui.setFilters('time',{clientId:'1'});const result=ui.use({scope:'time',title:'Time',columns:fields,rows:[{id:'a',clientId:'1'},{id:'b',clientId:'2'}]});
 assert.deepEqual(result.map(r=>r.id),['a']);assert.deepEqual(ui.columns().map(f=>f.key),fields.map(f=>f.key));
});
