import test from 'node:test';
import assert from 'node:assert/strict';
import {initSidebarUI} from '../public/sidebar-ui.js';
import {sidebarHTML} from '../public/sidebar-content.js';
import {sidebarGroups,workspaceSections,pageSections} from '../public/sidebar-sections.js';

function fixture(saved='false'){
 const original={document:globalThis.document,localStorage:globalThis.localStorage,requestAnimationFrame:globalThis.requestAnimationFrame};
 const listeners={},root={dataset:{}},writes=[],attrs={},button={setAttribute(k,v){attrs[k]=v;}};
 globalThis.document={documentElement:root,querySelector:()=>button,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
 globalThis.localStorage={getItem:()=>saved,setItem:(...a)=>writes.push(a)};
 globalThis.requestAnimationFrame=fn=>fn();
 const ui=initSidebarUI('audit');
 const click=kind=>{let prevented=false;for(const fn of listeners.click)fn({target:{closest:s=>s==='[data-sidebar-toggle]'&&kind==='toggle'?button:null},preventDefault(){prevented=true;}});return prevented;};
 return {ui,root,writes,attrs,click,restore:()=>Object.assign(globalThis,original)};
}
test('the toggle collapses and expands, saves the choice and labels itself',()=>{
 const f=fixture();
 try{
  assert.equal(f.root.dataset.sidebarCollapsed,'false');assert.equal(f.root.dataset.sidebarReady,'true');
  assert.equal(f.click('toggle'),true);assert.equal(f.root.dataset.sidebarCollapsed,'true');
  assert.deepEqual(f.writes.at(-1),['audit:sidebar-collapsed','true']);assert.equal(f.attrs['aria-label'],'Expand sidebar');assert.equal(f.attrs['aria-expanded'],'false');
  f.click('toggle');assert.equal(f.root.dataset.sidebarCollapsed,'false');assert.equal(f.attrs['aria-label'],'Collapse sidebar');
 }finally{f.restore();}
});
test('a saved collapsed sidebar opens collapsed; other clicks never toggle it',()=>{
 const f=fixture('true');
 try{assert.equal(f.root.dataset.sidebarCollapsed,'true');assert.equal(f.click('link'),false);assert.equal(f.root.dataset.sidebarCollapsed,'true');assert.equal(f.writes.length,0);}finally{f.restore();}
});

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`<svg data-i="${n}"></svg>`;
const state=(extra={})=>({settings:{name:'Alex Morgan',business:'Juniper Studio',...extra},clients:[],projects:[],documents:[],invoices:[],forms:[],time:[]});
const render=(s,opts={})=>sidebarHTML(s,{esc,icon,account:{enabled:true,user:{email:'alex@example.com'}},page:'projects',groups:sidebarGroups,hidden:id=>s.settings.sidebarSections?.[id]===false,shortcut:'⌘ K',...opts});

test('the sidebar follows the Harvest layout: one account card with notifications, settings apart from the profile',()=>{
 const html=render(state(),{unread:3});
 const order=['app-nav__brand','app-nav__search','app-nav__sections','app-nav__customize','data-action="mcp-guide"','data-action="workspace-settings"','getting-started-trigger','app-nav__account','app-nav__bell'];
 const at=order.map(s=>html.indexOf(s));assert.ok(at.every(i=>i>=0),order.filter((s,i)=>at[i]<0).join());
 assert.deepEqual([...at].sort((a,b)=>a-b),at);
 const card=html.slice(html.indexOf('class="app-nav__account"'),html.indexOf('</button>',html.indexOf('class="app-nav__account"')));
 for(const s of ['account-avatar','Alex Morgan','Juniper Studio'])assert.ok(card.includes(s),s);
 assert.match(html,/aria-label="Notifications, 3 unread"/);assert.ok(html.includes('app-nav__dot'));
 assert.ok(!html.includes('href="#notifications" class="app-nav__item'),'notifications are not a nav item');
 assert.match(html,/href="#projects" class="app-nav__item is-active" title="Projects" aria-current="page"/);
 const menu=html.slice(html.indexOf('id="account-menu"'),html.indexOf('id="getting-started-menu"'));
 for(const s of ['data-action="profile"','#settings/notifications','data-action="sidebar-theme"','data-action="signout"'])assert.ok(menu.includes(s),s);
 assert.ok(!render(state()).includes('app-nav__dot'));
});
test('customizing shows every section with a visibility toggle; hidden sections stay out of the nav',()=>{
 const s=state({sidebarSections:{contracts:false}});
 assert.ok(!render(s).includes('href="#contracts"'));
 const editing=render(s,{customizing:true});
 assert.equal((editing.match(/data-action="sidebar-visibility"/g)||[]).length,workspaceSections.length);
 assert.match(editing,/is-editing is-hidden" data-action="sidebar-visibility" data-id="contracts" aria-pressed="false"/);
 assert.ok(editing.includes('data-action="sidebar-customize-done"'));
 assert.ok(pageSections.some(([id])=>id==='notifications')&&!workspaceSections.some(([id])=>id==='notifications'));
});
test('user-provided names are escaped in the sidebar',()=>{
 const html=render(state({name:'<img src=x>',business:'"><b>'}));
 assert.ok(!html.includes('<img src=x>')&&!html.includes('"><b>'));
});
