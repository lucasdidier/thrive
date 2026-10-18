import {env} from 'cloudflare:workers';
import {handleMcp} from '../../server/mcp.mjs';
export async function POST(request:Request){return handleMcp(request,env.DB,env);}
export function GET(){return new Response('Use POST for stateless MCP requests.',{status:405,headers:{Allow:'POST'}});}
