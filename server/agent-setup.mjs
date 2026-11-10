// /agent-setup: instructions an AI agent reads to connect itself to Thrive over MCP (like Cloudflare's
// agent-setup prompt). The "Onboard your agent to Thrive" button copies one line pointing here.
export function agentSetupMarkdown(origin){
 const url=`${origin}/mcp`;
 return `# Connect this agent to Thrive

These are Thrive's official instructions for connecting an AI agent to a Thrive workspace through MCP. Thrive is a workspace for freelancers and studios: clients, projects, proposals, contracts, invoices, time, email, scheduling, forms and workflows.

Do the setup yourself wherever your agent can change its own MCP configuration. Only ask the user to act where a step needs them: signing in, or a settings screen you cannot reach.

- Server name: \`thrive\`
- URL: ${url}
- Transport: Streamable HTTP (remote MCP)
- Sign-in: OAuth in the browser. There is no API key. Never ask the user for a password, a session cookie or a token.

Preserve existing MCP servers and unrelated settings. If a server named \`thrive\` already exists, update it instead of adding a duplicate.

---

## Claude Code

\`\`\`
claude mcp add --transport http thrive ${url}
\`\`\`

Then tell the user to run \`/mcp\`, choose \`thrive\` and sign in to Thrive in the browser.

## Codex

\`\`\`
codex mcp add thrive --url ${url}
codex mcp login thrive
\`\`\`

## Cursor

Add to \`~/.cursor/mcp.json\` (or \`.cursor/mcp.json\` for one project), under \`"mcpServers"\`:

\`\`\`json
"thrive": { "url": "${url}" }
\`\`\`

Sign-in starts the first time a Thrive tool is used.

## GitHub Copilot (VS Code)

Add to \`.vscode/mcp.json\` (or the user-level MCP configuration), under \`"servers"\`:

\`\`\`json
"thrive": { "type": "http", "url": "${url}" }
\`\`\`

Then start the server from the MCP list and sign in when VS Code asks.

## Claude (claude.ai and Claude Desktop), ChatGPT and other chat apps

You cannot add connectors from inside a chat. Tell the user to add a custom connector themselves:

- Claude: Settings → Connectors → Add custom connector, URL ${url}
- ChatGPT: add a custom connector (MCP server) in Settings with URL ${url}

Then sign in to Thrive when asked and allow access.

## Any other agent

Register a remote MCP server named \`thrive\` with URL ${url} over Streamable HTTP, using OAuth.

---

## Check the connection

1. List the tools. They start with \`thrive_\`.
2. Call \`thrive_get_workspace\`. It only reads.
3. Tell the user it worked, in this form:

\`\`\`
Thrive connected
✓ MCP server   thrive · ${url}
✓ Signed in    <workspace name>
✓ Workspace    <n> clients · <n> open projects
\`\`\`

If the agent needs a restart to load new MCP servers, say so.

## When working in Thrive

- Read first. Before creating or changing anything, call \`thrive_preview_action\`, show the user the preview, and only then call \`thrive_execute_action\`.
- Never send an email, issue an invoice, publish a link or delete anything without the user saying yes to that specific action.
- Do not create or change anything during setup.
- The agent acts with the user's own access to their workspace. Treat client data as private.
`;
}
