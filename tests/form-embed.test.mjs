import test from 'node:test';
import assert from 'node:assert/strict';
import {formEmbedSnippet,embedOptions} from '../public/form-embed.js';
const token='a'.repeat(64);
test('embed snippets escape content, reject executable URLs and contain only a scoped form link',()=>{
 const code=formEmbedSnippet('https://thrive.example',token,{label:'<img src=x onerror=alert(1)>',theme:'dark',accent:'#94e3d5'});
 assert.ok(code.includes('data-thrive-theme="dark"'));assert.ok(code.includes('&lt;img'));assert.ok(!code.includes('<img'));assert.ok(code.includes('href="https://thrive.example/share/'+token+'"'));assert.ok(!code.includes('api/workspace'));
 for(const origin of ['javascript:alert(1)','data:text/html,hello','https://user:secret@thrive.example'])assert.throws(()=>formEmbedSnippet(origin,token));
 assert.throws(()=>formEmbedSnippet('https://thrive.example','"><script>'));assert.deepEqual(embedOptions({accent:'red;display:none',theme:'bad',label:' '}),{accent:'#42685b',theme:'light',label:'Contact me'});
});

import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function loader(){
 const nodes=[],events={},docEvents={},timers=[];
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.attributes={};this.listeners={};if(tag==='iframe')this.contentWindow={};nodes.push(this);}
  append(...nodes){this.children.push(...nodes);}attachShadow(){return new Element('shadow');}
  setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}addEventListener(k,v){this.listeners[k]=v;}
  get firstElementChild(){return this.children[0];}showModal(){this.open=true;}close(){this.open=false;}focus(){this.focused=true;}
 }
 const opener=new Element('a'),document={currentScript:{src:'https://thrive.example/embed.js'},body:new Element('body'),documentElement:new Element('html'),activeElement:opener,createElement:t=>new Element(t),addEventListener:(k,f)=>docEvents[k]=f,dispatchEvent:e=>docEvents.dispatched=e};document.documentElement.style.overflow='auto';
 const window={addEventListener:(k,f)=>events[k]=f};
 const context={window,document,location:{origin:'https://website.example'},URL,crypto:{randomUUID:()=> 'channel-123'},setTimeout:f=>timers.push(f),clearTimeout(){},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},console};
 const source=readFileSync(new URL('../public/embed.js',import.meta.url),'utf8');vm.runInNewContext(source,context);
 return {window,document,nodes,events,docEvents,opener,context,source};
}
test('loader isolates message sources, restores focus and scroll, and reuses the open form',()=>{
 const h=loader(),url='https://thrive.example/share/'+token;h.window.ThriveForms.open(url,{theme:'dark',accent:'#94e3d5'});
 const dialog=h.nodes.find(n=>n.tag==='dialog'),frame=h.nodes.find(n=>n.tag==='iframe'),src=frame.src;
 assert.equal(dialog.open,true);assert.equal(h.document.documentElement.style.overflow,'hidden');assert.equal(new URL(src).searchParams.get('parent_origin'),'https://website.example');assert.equal(frame.attributes.sandbox,'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
 const message={origin:'https://thrive.example',source:frame.contentWindow,data:{type:'thrive:close',channel:'channel-123'}};
 for(const forged of [{...message,origin:'https://evil.example'},{...message,source:{}},{...message,data:{...message.data,channel:'wrong'}}]){h.events.message(forged);assert.equal(dialog.open,true);}
 h.events.message({...message,data:{...message.data,type:'thrive:submitted',answers:{private:'do not forward'}}});assert.deepEqual(JSON.parse(JSON.stringify(h.docEvents.dispatched.detail)),{url});
 h.events.message(message);assert.equal(dialog.open,false);assert.equal(h.document.documentElement.style.overflow,'auto');assert.equal(h.opener.focused,true);
 h.window.ThriveForms.open(url,{theme:'dark',accent:'#94e3d5'});assert.equal(frame.src,src);assert.equal(h.nodes.filter(n=>n.tag==='iframe').length,1);
 const api=h.window.ThriveForms;vm.runInNewContext(h.source,h.context);assert.equal(h.window.ThriveForms,api);
 assert.throws(()=>h.window.ThriveForms.open('https://evil.example/share/'+token));assert.throws(()=>h.window.ThriveForms.open('https://thrive.example/api/workspace'));
});

test('inline embedding uses only a scoped form URL with escaped attributes',()=>{
 const code=formEmbedSnippet('https://thrive.example',token,{placement:'inline',label:'Contact " us <now>'});
 assert.ok(code.includes(`/embed/form/${token}?mode=inline`));assert.ok(code.includes('width="100%"'));assert.ok(code.includes('Contact &quot; us &lt;now&gt;'));assert.ok(!code.includes('<script'));assert.ok(code.includes('allow-popups'));
});
