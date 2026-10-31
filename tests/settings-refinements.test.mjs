import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogUI} from '../public/services-ui.js';
import {connectionSettings} from '../public/connection-settings.js';

const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const helpers={esc,icon:()=>'',stamp:String,btn:(label,action,attrs='')=>`<button data-action="${action}" ${attrs}>${label}</button>`};
test('catalog separates archives and moves a restored service back into the active list',async()=>{
 const state={services:[{id:'active',name:'Brand workshop',kind:'service',items:[{quantity:1,rate:10000}],archived:false},{id:'archived',name:'Legacy consulting',kind:'service',items:[{quantity:1,rate:5000}],archived:true}]};
 let html='';const ui=createCatalogUI({...helpers,getState:()=>state,open:(_title,body)=>html=body,dialog:{querySelector:()=>null,querySelectorAll:()=>[]},save:async()=>{},render:()=>{},toast:()=>{}});
 ui.handleClick('services');assert.match(html,/Brand workshop/);assert.doesNotMatch(html,/Legacy consulting/);
 ui.handleClick('service-view',{dataset:{view:'archived'}});assert.match(html,/Legacy consulting/);assert.doesNotMatch(html,/Brand workshop/);
 ui.handleClick('service-archive',{dataset:{id:'archived'}});await new Promise(resolve=>setImmediate(resolve));
 assert.match(html,/No archived services/);assert.equal(state.services[1].archived,false);
 ui.handleClick('service-view',{dataset:{view:'active'}});assert.match(html,/Brand workshop/);assert.match(html,/Legacy consulting/);
});
test('connected account has one shared reconnect action and shared disconnect explanation',()=>{
 const html=connectionSettings({configured:true,provider:'nylas',account:{email:'studio@example.com',provider:'microsoft',gmail:true,calendar:true}},helpers);
 assert.equal((html.match(/data-action="mail-connect"/g)||[]).length,1);
 assert.match(html,/data-mode="all" data-provider="microsoft"/);assert.match(html,/Connected<\/span>/);
 assert.match(html,/Disconnects email and calendar together/);
});
test('incomplete grants ask to reconnect the same account with both capabilities',()=>{
 const html=connectionSettings({configured:true,account:{email:'studio@example.com',gmail:true,calendar:false}},helpers);
 assert.match(html,/Needs attention/);assert.match(html,/enable calendar access/);assert.match(html,/data-mode="all"/);
});
test('unconfigured account disables connections and escapes account names',()=>{
 const html=connectionSettings({configured:false,provider:'nylas'},helpers);
 assert.equal((html.match(/data-mode="all"[^>]*disabled/g)||[]).length,2);
 assert.match(html,/Not connected/);
 const account=connectionSettings({configured:true,account:{email:'<script>bad</script>',gmail:true,calendar:true}},helpers);
 assert.doesNotMatch(account,/<script>/);assert.match(account,/&lt;script>/);
});
test('removing a client logo keeps it removed rather than restoring its demo fallback',async()=>{
 const {clientLogo}=await import('../public/client-logo.js');
 const client={name:'Juniper Studio',email:'hello@juniper.example'};
 assert.match(clientLogo(client),/^data:image/);
 assert.equal(clientLogo({...client,logo:''}),'');
});
