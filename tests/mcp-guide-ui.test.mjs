import test from 'node:test';
import assert from 'node:assert/strict';
import {guideHTML,AGENTS,EXAMPLES,setupPrompt,onboardPill} from '../public/mcp-guide.js';
import {agentSetupMarkdown} from '../server/agent-setup.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const helpers={esc,icon:n=>`<svg data-icon="${n}"></svg>`,btn:(label,action,attrs='',cls='')=>`<button class="btn ${cls}" data-action="${action}" ${attrs}>${label}</button>`,featureIcon:n=>`<span data-feature="${n}"></span>`,callout:({title})=>`<aside>${title}</aside>`};

test('Use with AI: one button copies a prompt pointing at /agent-setup, the URL for chat apps, and ten examples',()=>{
 const html=guideHTML({origin:'https://app.runonthrive.com',...helpers});
 assert.equal(setupPrompt('https://app.runonthrive.com'),'Read https://app.runonthrive.com/agent-setup and follow it to connect yourself to my Thrive workspace.');
 assert.ok(html.includes(`data-prompt="${esc(setupPrompt('https://app.runonthrive.com'))}"`));
 assert.equal((html.match(/class="mcp-agent-logo"/g)||[]).length,AGENTS.length);
 assert.doesNotMatch(html,/role="tab"|mcp-demo/,'no agent tabs or replayed chat');
 assert.match(html,/https:\/\/app\.runonthrive\.com\/mcp/);assert.match(html,/data-action="mcp-copy-endpoint"/);
 assert.equal(EXAMPLES.length,10);assert.equal((html.match(/class="mcp-example"/g)||[]).length,10);
 assert.doesNotMatch(onboardPill('https://x.test',helpers),/mcp-pill-dismiss/);assert.match(onboardPill('https://x.test',{...helpers,dismiss:true}),/mcp-pill-dismiss/);
});

test('/agent-setup tells any agent how to connect, check read-only, and preview before changes',()=>{
 const md=agentSetupMarkdown('https://app.runonthrive.com');
 for(const s of ['claude mcp add --transport http thrive https://app.runonthrive.com/mcp','codex mcp add thrive --url https://app.runonthrive.com/mcp','"mcpServers"','"servers"','Add custom connector','thrive_get_workspace','thrive_preview_action','Never ask the user for a password'])assert.ok(md.includes(s),s);
});

test('every example prompt asks for a preview or stays read-only',()=>{
 for(const [,label,,prompt] of EXAMPLES)assert.match(prompt,/preview|draft|don’t|List|Check|Summarize/i,label);
});
