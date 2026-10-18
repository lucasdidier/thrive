import {catalog,actionCatalog,executeOperation,testWorkflow,records,fieldsFor,initWorkflows,checkShape} from './operations.mjs';
import {loadWorkspace,commitWorkspace,readEvents,hashRequest,receiptFor,StoreError} from './store.mjs';
import {ownerOf,checkOrigin,readBody,json} from './http.mjs';
import {validateWorkspace} from './validation.mjs';
const string={type:'string'},revision={type:'integer',minimum:0},limit={type:'integer',minimum:1},scope={enum:Object.keys(catalog().entities).concat(['workflow','customField','shareLink'])};
const tool=(name,description,properties={},required=[],write=false)=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint:!write,destructiveHint:write,idempotentHint:!write,openWorldHint:false}});
export const mcpTools=[
 tool('thrive_get_workspace','Get the current revision, record counts, and initialization status. Open Thrive once to migrate existing browser records.'),
 tool('thrive_get_catalog','Discover every trigger and executable action, its input schema, and the workspace custom field definitions.'),
 tool('thrive_list_records','List records (up to 100 per page) or search by text. customField returns definitions for clients and projects.',{entity:scope,query:string,offset:revision,limit},['entity']),
 tool('thrive_get_record','Read one complete record and its current revision.',{entity:scope,id:string},['entity','id']),
 tool('thrive_preview_action','Validate an action against a copy of the current workspace. Includes triggered workflow effects. Does not save changes.',{action:{enum:actionCatalog().map(a=>a.id)},input:{type:'object'}},['action','input']),
 tool('thrive_execute_action','Execute a catalog action on the authenticated workspace. Read first; use expected_revision for concurrency and a unique request_id for safe retries. Never sends email or collects payments.',{action:{enum:actionCatalog().map(a=>a.id)},input:{type:'object'},expected_revision:revision,request_id:string},['action','input','expected_revision','request_id'],true),
 tool('thrive_test_workflow','Simulate one trigger and one action on a sample record. No live event or record is created.',{workflow:{type:'object'},record_id:string},['workflow','record_id']),
 tool('thrive_read_events','Poll committed business events after a cursor. Actual mutations emit these triggers; events cannot be forged.',{after:revision,limit}),
 tool('thrive_list_workflow_runs','Read the latest workflow runs, including failures and loop prevention.',{limit})
];
const allRecords=(s,e)=>e==='shareLink'?(s.shareLinks||[]).map(l=>({...l,path:`/share/${l.token}`})):e==='workflow'?initWorkflows(s).workflows:e==='customField'?['client','project'].flatMap(entity=>fieldsFor(s,entity,true).map(f=>({...f,entity}))):records(s,e);
const eventSummary=events=>events.map(({id,type,entity,recordId,fieldId,value,previousValue})=>({id,type,entity,recordId,fieldId,value,previousValue}));
export async function callTool(db,owner,name,args){const tool=mcpTools.find(t=>t.name===name);if(!tool)throw Error('Unknown tool.');checkShape(args,tool.inputSchema);if(args.limit>100)throw Error('Limit must be 100 or fewer.');
 const current=await loadWorkspace(db,owner);
 if(name==='thrive_get_workspace')return {initialized:!!current,revision:current?.revision??null,counts:current?Object.fromEntries(Object.keys(catalog().entities).map(e=>[e,records(current.state,e).length])):{},updatedAt:current?.updatedAt};
 if(name==='thrive_get_catalog')return {...catalog(),customFields:current?allRecords(current.state,'customField'):[],revision:current?.revision??null};
 if(!current)throw new StoreError('Open Thrive once to import this browser’s workspace before using record tools.',409);
 const {state,revision}=current;
 if(name==='thrive_list_records'){const query=(args.query||'').toLowerCase(),rows=allRecords(state,args.entity).filter(r=>!query||[r.name,r.title,r.number,r.email,r.body,r.note].some(v=>typeof v==='string'&&v.toLowerCase().includes(query))),offset=args.offset||0,limit=args.limit||50;return {revision,records:rows.slice(offset,offset+limit),total:rows.length,nextOffset:offset+limit<rows.length?offset+limit:null};}
 if(name==='thrive_get_record'){const record=allRecords(state,args.entity).find(r=>r.id===args.id);if(!record)throw Error('Record not found.');return {revision,record};}
 if(name==='thrive_read_events'){const events=await readEvents(db,owner,args.after||0,args.limit||50);return {revision,events,nextCursor:events.at(-1)?.id??args.after??0};}
 if(name==='thrive_list_workflow_runs')return {revision,runs:initWorkflows(state).runs.slice(0,args.limit||50)};
 if(name==='thrive_test_workflow')return {revision,result:testWorkflow(state,args.workflow,args.record_id),preview:true};
 if(name==='thrive_execute_action'||name==='thrive_preview_action'){
  const hash=await hashRequest(args);if(name==='thrive_execute_action'){const receipt=await receiptFor(db,owner,args.request_id,hash);if(receipt)return {...receipt,replayed:true};if(args.expected_revision!==revision)throw new StoreError('Workspace changed. Read the latest revision and preview again.',409);}
  const out=executeOperation(state,args.action,args.input,args.request_id||'preview-operation');validateWorkspace(out.state,state);const response={result:out.result,events:eventSummary(out.events),workflowRuns:initWorkflows(out.state).runs.filter(r=>!initWorkflows(state).runs.some(old=>old.id===r.id))};
  if(name==='thrive_preview_action')return {...response,revision,preview:true};
  return commitWorkspace(db,owner,revision,out.state,args.request_id,hash,response,out.events);
 }
 throw Error('Tool unavailable.');
}
export async function handleMcp(request,db){let rpc;const reply=(result,status=200)=>json({jsonrpc:'2.0',id:rpc?.id??null,result},status),error=(code,message,status=200)=>json({jsonrpc:'2.0',id:rpc?.id??null,error:{code,message}},status);
 try{checkOrigin(request);rpc=await readBody(request);if(!rpc||Array.isArray(rpc)||rpc.jsonrpc!=='2.0'||typeof rpc.method!=='string'||rpc.id!=null&&!['number','string'].includes(typeof rpc.id))return error(-32600,'Invalid JSON-RPC request.',400);
 if(rpc.method==='notifications/initialized'&&rpc.id===undefined)return new Response(null,{status:202});
 if(rpc.id===undefined)return error(-32600,'Request ID required.',400);
 if(rpc.method==='initialize')return reply({protocolVersion:['2024-11-05','2025-03-26','2025-06-18','2025-11-25'].includes(rpc.params?.protocolVersion)?rpc.params.protocolVersion:'2025-11-25',capabilities:{tools:{listChanged:false}},serverInfo:{name:'thrive',version:'0.2.0'},instructions:'Use get_catalog and get_workspace first. Preview writes, then execute with the observed revision and a unique request ID. Monetary record amounts are integer cents; workflow amount inputs are USD decimal strings. Document signatures remain prototype simulations.'});
 if(rpc.method==='ping')return reply({});
 if(rpc.method==='tools/list')return reply({tools:mcpTools});
 if(rpc.method!=='tools/call')return error(-32601,'Method not found.');
 const owner=ownerOf(request);
 try{const result=await callTool(db,owner,rpc.params?.name,rpc.params?.arguments||{});return reply({content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:false});}catch(err){return reply({content:[{type:'text',text:err.message}],structuredContent:{error:err.message,status:err.status||400},isError:true});}
 }catch(err){return error(err.status===401?-32001:-32600,err.message,err.status||400);}
}
