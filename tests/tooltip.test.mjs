import test from 'node:test';
import assert from 'node:assert/strict';
import {tooltipText,tooltipPlacement} from '../public/tooltip.js';

// Minimal element stand-in: attributes, dataset, text and an optional sidebar ancestor.
const el=({attrs={},text='',tip,nav=false}={})=>({dataset:tip?{tip}:{},textContent:text,getAttribute:k=>attrs[k]??null,closest:sel=>nav&&sel==='.app-nav'?{}:null});

test('icon-only controls get a tooltip from title, then aria-label',()=>{
 assert.equal(tooltipText(el({attrs:{title:'Collapse sidebar','aria-label':'Collapse'}})),'Collapse sidebar');
 assert.equal(tooltipText(el({attrs:{'aria-label':'Close'}})),'Close');
 assert.equal(tooltipText(el()),'');
});
test('controls with visible text get none, unless the sidebar rail hides it',()=>{
 const item=el({attrs:{title:'Projects'},text:'Projects',nav:true});
 assert.equal(tooltipText(item),'');
 assert.equal(tooltipText(item,{collapsed:true}),'Projects');
 assert.equal(tooltipText(el({attrs:{'aria-label':'Save'},text:'Save'}),{collapsed:true}),'');
 assert.equal(tooltipText(el({text:'Export',tip:'Download as CSV'})),'Download as CSV');
});
test('sidebar tooltips open to the right, others below',()=>{
 assert.equal(tooltipPlacement(el({nav:true})),'right');
 assert.equal(tooltipPlacement(el()),'bottom');
});
