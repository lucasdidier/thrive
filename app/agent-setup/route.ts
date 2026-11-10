import {agentSetupMarkdown} from '../../server/agent-setup.mjs';
// Public, read by AI agents: how to connect to this Thrive's MCP server. The "Onboard your agent" button
// copies a prompt that points here.
export function GET(request:Request){
 return new Response(agentSetupMarkdown(new URL(request.url).origin),{headers:{'Content-Type':'text/markdown; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
}
