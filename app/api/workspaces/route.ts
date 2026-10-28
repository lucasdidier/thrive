import {env} from 'cloudflare:workers';
import {withRuntime} from '../../../server/runtime.mjs';
import {checkOrigin,readBody,json} from '../../../server/http.mjs';
import {listWorkspaces,createWorkspace,saveAccountProfile} from '../../../server/workspace-directory.mjs';
export async function GET(request:Request){return withRuntime(request,env,async({db,user})=>json(await listWorkspaces(db,user)));}
export async function POST(request:Request){return withRuntime(request,env,async({request,db,user})=>{checkOrigin(request);return json(await createWorkspace(db,user,await readBody(request)));});}
export async function PATCH(request:Request){return withRuntime(request,env,async({request,db,user})=>{checkOrigin(request);return json({profile:await saveAccountProfile(db,user,await readBody(request))});});}
