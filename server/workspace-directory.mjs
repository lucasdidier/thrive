import {loadWorkspace,bootstrap,commitWorkspace,hashRequest,StoreError} from './store.mjs';
import {emptyWorkspace} from './account-workspace.mjs';
import {currencies} from '../public/currency.js';
const validId=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id);
export const workspaceOwner=(owner,id)=>id==='default'?owner:`${owner}:workspace:${id}`;
const directoryOwner=owner=>`${owner}:workspace-directory`;
export async function directory(db,user){
 let row=await loadWorkspace(db,directoryOwner(user.owner));if(row)return row;
 const primary=await loadWorkspace(db,user.owner),s=primary?.state.settings;
 return bootstrap(db,directoryOwner(user.owner),{activity:[],settings:{},workspaceIds:['default'],profile:{name:s?.name||user.name||'Your name',profilePhoto:s?.profilePhoto||''}});
}
export async function resolveWorkspace(db,user,id){
 if(!id||id==='default')return user.owner;
 if(!validId(id))throw new StoreError('Workspace not found.',404);
 const row=await directory(db,user);
 if(!row.state.workspaceIds.includes(id))throw new StoreError('Workspace not found.',404);
 return workspaceOwner(user.owner,id);
}
async function updateDirectory(db,user,mutate){
 for(let attempt=0;attempt<5;attempt++){
  const row=await directory(db,user),state=structuredClone(row.state);mutate(state);
  try{await commitWorkspace(db,directoryOwner(user.owner),row.revision,state,crypto.randomUUID(),await hashRequest(state),{ok:true});return state;}catch(e){if(e.status!==409||attempt===4)throw e;}
 }
}
export async function listWorkspaces(db,user){
 const row=await directory(db,user),workspaces=await Promise.all(row.state.workspaceIds.map(async id=>{const w=await loadWorkspace(db,workspaceOwner(user.owner,id)),s=w?.state.settings;return {id,name:s?.business||user.business||'My workspace',logo:s?.workspaceLogo||''};}));
 return {workspaces,profile:row.state.profile};
}
export async function createWorkspace(db,user,{id,name,currency}){
 if(!validId(id)||typeof name!=='string'||!name.trim()||name.trim().length>80||!Object.hasOwn(currencies,currency))throw new StoreError('Enter a workspace name and choose a currency.');
 const row=await directory(db,user),state=emptyWorkspace({...user,name:row.state.profile.name,business:name.trim()});
 Object.assign(state.settings,row.state.profile,{currency});
 // A client-generated ID makes a retry safe even if the response is lost.
 await bootstrap(db,workspaceOwner(user.owner,id),state);
 await updateDirectory(db,user,s=>{if(!s.workspaceIds.includes(id))s.workspaceIds.push(id);});
 return {id};
}
export async function saveAccountProfile(db,user,profile){
 if(typeof profile.name!=='string'||!profile.name.trim()||profile.name.trim().length>80||typeof profile.profilePhoto!=='string'||profile.profilePhoto.length>150000||(profile.profilePhoto&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(profile.profilePhoto)))throw new StoreError('Enter a name and a valid profile photo.');
 const result=await updateDirectory(db,user,s=>{s.profile={name:profile.name.trim(),profilePhoto:profile.profilePhoto};});return result.profile;
}
export async function resolveCallbackWorkspace(db,user,url){
 const provider=url.pathname.match(/^\/api\/(google|nylas)\/callback$/)?.[1],state=url.searchParams.get('state');
 if(!provider||!state||state.length>200)return null;
 const row=await db.prepare(`SELECT owner_id FROM ${provider}_oauth_states WHERE hash=?`).bind(await hashRequest(state)).first();
 if(!row||row.owner_id===user.owner)return null;
 const d=await directory(db,user),id=d.state.workspaceIds.find(id=>workspaceOwner(user.owner,id)===row.owner_id);
 if(!id)throw new StoreError('This connection belongs to another account.',403);
 return id;
}
