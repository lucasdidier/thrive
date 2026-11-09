import test from 'node:test';
import assert from 'node:assert/strict';
import {guideHTML,AGENTS,EXAMPLES,setupPrompt} from '../public/mcp-guide.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers={esc,icon:n=>`<svg data-icon="${n}"></svg>`,btn:(label,action,attrs='',cls='')=>`<button class="btn ${cls}" data-action="${action}" ${attrs}>${label}</button>`,featureIcon:n=>`<span data-feature="${n}"></span>`,callout:({title})=>`<aside>${title}</aside>`};

test('Use with AI shows agent tabs, the demo window, the setup prompt and URL, and ten examples',()=>{
 const html=guideHTML({endpoint:'https://runonthrive.com/mcp',...helpers});
 assert.equal((html.match(/role="tab"/g)||[]).length,AGENTS.length);
 assert.equal((html.match(/aria-selected="true"/g)||[]).length,1);
 assert.match(html,/class="mcp-demo" data-endpoint="https:\/\/runonthrive\.com\/mcp"/);
 assert.equal(EXAMPLES.length,10);assert.equal((html.match(/class="mcp-example"/g)||[]).length,10);
 assert.ok(html.includes(esc(setupPrompt('https://runonthrive.com/mcp'))));assert.match(html,/data-action="mcp-copy-endpoint"/);
 assert.doesNotMatch(html,/expandable-card/,'the setup prompt no longer sits in a separate expandable row');
});

test('every example prompt asks for a preview or stays read-only',()=>{
 for(const [,label,,prompt] of EXAMPLES)assert.match(prompt,/preview|draft|don’t|List|Check|Summarize/i,label);
});
