// Settings → AI & MCP ("Use with AI"): one button copies a setup prompt that points the agent at /agent-setup
// (server/agent-setup.mjs), which tells it how to connect itself, plus the URL for chat apps and example requests.
// The same button sits on Home until dismissed (onboardPill).
export const AGENTS=[
 {id:'claude',name:'Claude',logo:'claude-color.svg'},
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

// Home shows the button until it's hidden; remembered per browser.
const PILL_KEY='thrive-agent-onboard-hidden';
export function pillDismissed(){try{return localStorage.getItem(PILL_KEY)==='1';}catch{return false;}}
export function dismissPill(){try{localStorage.setItem(PILL_KEY,'1');}catch{}document.querySelectorAll('.dashboard > .mcp-onboard').forEach(el=>el.remove());}

// What the button copies: one line the agent follows.
export function setupPrompt(origin){
 return `Read ${origin}/agent-setup and follow it to connect yourself to my Thrive workspace.`;
}

export function onboardPill(origin,{esc,icon,dismiss=false}={}){
 const logos=AGENTS.map(a=>`<img class="mcp-agent-logo" src="/agents/${a.logo}" alt="" width="18" height="18">`).join('');
 return `<div class="mcp-onboard"><button type="button" class="mcp-onboard-pill" data-action="mcp-copy-prompt" data-prompt="${esc(setupPrompt(origin))}" title="Copies a setup prompt for your AI agent" aria-label="Onboard your agent to Thrive: copies a setup prompt for your AI agent"><span>Onboard your agent to Thrive</span><span class="mcp-onboard-logos" aria-hidden="true">${logos}</span></button>${dismiss?`<button type="button" class="mcp-onboard-dismiss" data-action="mcp-pill-dismiss" aria-label="Hide" title="Hide">${icon('close')}</button>`:''}</div>`;
}

export function guideHTML({origin,esc,icon,btn,featureIcon,callout}){
 const endpoint=`${origin}/mcp`;
 return `<div class="dialog-body mcp-guide">
<section class="mcp-section"><header><h2>Connect an agent</h2><p>Paste the prompt into Claude Code, Codex, Cursor, Copilot or any agent that can add MCP servers. It sets itself up and asks you to sign in to Thrive.</p></header>
${onboardPill(origin,{esc,icon})}
<p class="mcp-or">In Claude or ChatGPT, add a custom connector with this URL:</p>
<div class="mcp-manual-control"><code>${esc(endpoint)}</code>${btn(icon('copy')+'Copy URL','mcp-copy-endpoint','aria-label="Copy Thrive MCP server URL"','subtle')}</div>
</section>
<section class="mcp-section"><header><h2>Try asking</h2></header><div class="mcp-examples">${EXAMPLES.map(([ico,label,short,full])=>`<div class="mcp-example">${featureIcon(ico,'sm')}<div><strong>${esc(label)}</strong><p>“${esc(short)}”</p></div>${btn(icon('copy'),'mcp-copy-prompt',`data-prompt="${esc(full)}" aria-label="Copy prompt: ${esc(label)}" title="Copy prompt"`,'subtle icon-only')}</div>`).join('')}</div></section>
${callout({title:'Agents act with your access',body:'<p>Ask for a preview before anything is created, changed or sent.</p>'})}
</div>`;
}
