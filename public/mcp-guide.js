// Settings → AI & MCP ("Use with AI"): pick an agent, watch it connect to Thrive, copy the setup prompt or URL,
// and copy example requests. Rendered by client-import-ui.js; the demo replays when another agent is picked.
const reduce=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait=ms=>new Promise(r=>setTimeout(r,reduce()?0:ms));
const plural=(n,word)=>`${n} ${word}${n===1?'':'s'}`;

export const AGENTS=[
 {id:'claude',name:'Claude',logo:'claude-color.svg',connector:true},
 {id:'codex',name:'Codex',logo:'codex-color.svg'},
 {id:'cursor',name:'Cursor',logo:'cursor.svg'},
 {id:'copilot',name:'GitHub Copilot',logo:'githubcopilot.svg'},
];

// [feature icon, label, what it shows, the prompt that gets copied]
export const EXAMPLES=[
 ['clients','Import clients','Import this CSV and show me a preview first.','Import the attached CSV into Thrive. Preview the import, show me inferred fields and skipped rows, and wait for my approval before importing.'],
 ['invoices','Chase overdue invoices','Which invoices are overdue? Draft a reminder for each.','List my overdue Thrive invoices with amounts and days late, then draft a friendly reminder email for each. Save them as drafts; don’t send anything.'],
 ['documents','Draft a proposal','Write a proposal for my newest client from my services.','Find my newest Thrive client and draft a proposal for them using my service catalog. Show me the preview before saving it.'],
 ['projects','Plan my week','Which projects are due in the next two weeks?','List my Thrive projects due in the next two weeks with their status, client and what still needs doing.'],
 ['time','Bill tracked time','Turn this month’s unbilled time into invoice drafts.','Find my unbilled Thrive time entries for this month and create one invoice draft per project. Preview the drafts before saving; don’t issue them.'],
 ['calendar','Find a meeting slot','When am I free on Friday afternoon?','Check my connected calendar and list the free 30-minute slots on Friday afternoon.'],
 ['workflows','Automate a step','When a client accepts a proposal, draft their contract.','Create a Thrive workflow: when a client accepts a proposal, create a contract draft for that project. Show me a preview before saving it.'],
 ['forms','Create a form','Build a project inquiry form I can share.','Create a project inquiry form in Thrive from the inquiry template. Preview the questions and wait for my approval before saving it and creating a share link.'],
 ['mail','Follow up','Which clients are waiting on a reply from me?','List the Thrive email conversations that need my reply, oldest first, and draft a short answer for each. Save them as drafts only.'],
 ['overview','Weekly summary','Summarize my week: new clients, signatures, payments.','Summarize my Thrive week: new clients, documents accepted or signed, invoices paid and anything overdue.'],
];

export function setupPrompt(endpoint){
 return `Connect this agent to my Thrive workspace through MCP.\n\nServer name: thrive\nTransport: Streamable HTTP (remote MCP)\nServer URL: ${endpoint}\n\nUse this agent’s supported MCP configuration to add the server, preserving my existing servers and settings. If you cannot change the configuration directly, give me the exact steps for this agent. Use the server’s browser sign-in and pause for me to sign in to Thrive and allow access. Do not ask me to paste passwords or session cookies.\n\nAfter connecting, discover the available tools and verify access with a read-only workspace request. Report whether the connection works. Do not create or change records, send messages, or publish anything during setup.`;
}

export function guideHTML({endpoint,esc,icon,btn,featureIcon,callout}){
 const prompt=setupPrompt(endpoint);
 return `<div class="dialog-body mcp-guide">
<section class="mcp-section"><header><h2>Connect an agent</h2></header>
<div class="mcp-agents" role="tablist" aria-label="AI agents">${AGENTS.map((a,i)=>`<button type="button" class="mcp-agent-tab" role="tab" aria-selected="${i===0}" data-action="mcp-agent" data-agent="${a.id}"><img class="mcp-agent-logo" src="/agents/${a.logo}" alt="" width="18" height="18">${esc(a.name)}</button>`).join('')}</div>
<div class="mcp-demo" data-endpoint="${esc(endpoint)}"><header class="mcp-demo-head"><img class="mcp-agent-logo" src="/agents/${AGENTS[0].logo}" alt="" width="16" height="16"><strong>${esc(AGENTS[0].name)}</strong><span class="mcp-demo-status" hidden>Connected to Thrive</span></header><ol class="mcp-demo-log" aria-live="polite"></ol></div>
<div class="mcp-connect">${btn(icon('copy')+'Copy setup prompt','mcp-copy-prompt',`data-prompt="${esc(prompt)}"`,'primary')}<div class="mcp-manual-control"><code>${esc(endpoint)}</code>${btn(icon('copy')+'Copy URL','mcp-copy-endpoint','aria-label="Copy Thrive MCP server URL"','subtle')}</div></div>
</section>
<section class="mcp-section"><header><h2>Try asking</h2></header><div class="mcp-examples">${EXAMPLES.map(([ico,label,short,full])=>`<div class="mcp-example">${featureIcon(ico,'sm')}<div><strong>${esc(label)}</strong><p>“${esc(short)}”</p></div>${btn(icon('copy'),'mcp-copy-prompt',`data-prompt="${esc(full)}" aria-label="Copy prompt: ${esc(label)}" title="Copy prompt"`,'subtle icon-only')}</div>`).join('')}</div></section>
${callout({title:'Agents act with your access',body:'<p>Ask for a preview before anything is created, changed or sent.</p>'})}
</div>`;
}

function steps(agent,endpoint,counts){
 const url=`<code>${endpoint.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</code>`;
 return [
  agent.connector?{type:'you',html:`Settings → Connectors → Add custom connector<br>${url}`}:{type:'you',html:`<span class="mcp-demo-label">Setup prompt</span>Connect this agent to my Thrive workspace through MCP. ${url}`},
  {type:'tool',html:`<strong>${agent.connector?'Connector added':'MCP server added'}</strong><span>thrive · Streamable HTTP</span>`},
  {type:'tool',html:'<strong>Signed in to Thrive</strong><span>access allowed</span>'},
  {type:'tool',html:`<code>thrive_get_workspace</code><span>${plural(counts.clients,'client')} · ${plural(counts.projects,'open project')}</span>`},
  {type:'agent',html:'Connected to your Thrive workspace. I’ll show you a preview before changing anything, and ask before sending. What should we start with?'},
 ];
}

let run=0;
// Plays (or replays) the connection for one agent. Reduced motion shows the finished conversation at once.
export async function playDemo(root,agentId,counts,icon){
 const demo=root?.querySelector('.mcp-demo');if(!demo)return;
 const agent=AGENTS.find(a=>a.id===agentId)||AGENTS[0],token=++run;
 root.querySelectorAll('.mcp-agent-tab').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.agent===agent.id)));
 const head=demo.querySelector('.mcp-demo-head'),log=demo.querySelector('.mcp-demo-log'),status=demo.querySelector('.mcp-demo-status');
 head.querySelector('img').src='/agents/'+agent.logo;head.querySelector('strong').textContent=agent.name;
 status.hidden=true;log.replaceChildren();
 for(const [i,step] of steps(agent,demo.dataset.endpoint||'',counts).entries()){
  await wait(i?650:200);if(token!==run||!demo.isConnected)return;
  const li=document.createElement('li');li.className='mcp-step mcp-step--'+step.type;
  if(step.type==='agent'){li.innerHTML='<span class="mcp-typing" aria-hidden="true"><i></i><i></i><i></i></span>';log.append(li);await wait(700);if(token!==run||!demo.isConnected)return;}
  li.innerHTML=(step.type==='tool'?icon('check'):'')+`<div>${step.html}</div>`;
  if(!li.isConnected)log.append(li);
 }
 status.hidden=false;
}
