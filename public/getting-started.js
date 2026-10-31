// Progress belongs to the workspace and survives reloads and skipped steps.
export const gettingStartedSteps = [
 {id:'clients',label:'Import your clients',icon:'clients',action:'ci-start'},
 {id:'connections',label:'Connect email & calendar',icon:'calendar',page:'settings/connections'},
 {id:'services',label:'Add your first service',icon:'tag',page:'settings/services'},
 {id:'workflows',label:'Create a workflow',icon:'workflows',action:'wf-new'},
 {id:'invoices',label:'Create an invoice',icon:'invoices',action:'new-invoice'},
 {id:'documents',label:'Create a proposal or contract',icon:'documents',action:'new-proposal'},
];
export function observedSteps(s,connection){
 return [s.clients?.length&&'clients',connection?.account?.gmail&&connection.account.calendar&&'connections',s.services?.length&&'services',s.automation?.workflows?.length&&'workflows',(s.invoices?.length||s.invoiceDrafts?.length)&&'invoices',s.documents?.some(d=>['proposal','contract','agreement'].includes(d.kind))&&'documents'].filter(Boolean);
}
export function stepEvidence(s,connection){return {
 clients:(s.clients||[]).map(x=>x.id),connections:connection?.account?.gmail&&connection?.account?.calendar?['connected']:[],
 services:(s.services||[]).map(x=>x.id),workflows:(s.automation?.workflows||[]).map(x=>x.id),
 invoices:[...(s.invoices||[]),...(s.invoiceDrafts||[])].map(x=>x.id),documents:(s.documents||[]).filter(x=>['proposal','contract','agreement'].includes(x.kind)).map(x=>x.id)
};}
export function resetGettingStarted(s,id,connection){
 if(!gettingStartedSteps.some(x=>x.id===id))throw Error('Unknown getting started step.');
 rememberGettingStarted(s,connection);const saved=s.settings.gettingStarted;
 saved.completed=saved.completed.filter(x=>x!==id);saved.skipped=saved.skipped.filter(x=>x!==id);
 saved.reopened={...saved.reopened,[id]:stepEvidence(s,connection)[id]};saved.hidden=false;
}
export function completeGettingStarted(s,id){
 if(!gettingStartedSteps.some(x=>x.id===id))throw Error('Unknown getting started step.');
 const saved=s.settings.gettingStarted||{completed:[],skipped:[]};
 saved.completed=[...new Set([...saved.completed,id])];saved.skipped=saved.skipped.filter(x=>x!==id);delete saved.reopened?.[id];s.settings.gettingStarted=saved;
}
export function gettingStartedProgress(s,connection){
 const saved=s.settings.gettingStarted||{},evidence=stepEvidence(s,connection),observed=observedSteps(s,connection).filter(id=>!saved.reopened?.[id]||evidence[id].some(x=>!saved.reopened[id].includes(x))),completed=new Set([...(saved.completed||[]),...observed]);
 return gettingStartedSteps.map(step=>({...step,status:completed.has(step.id)?'complete':saved.skipped?.includes(step.id)?'skipped':'pending'}));
}
export function rememberGettingStarted(s,connection){
 const saved=s.settings.gettingStarted||{};
 s.settings.gettingStarted={...saved,completed:gettingStartedProgress(s,connection).filter(x=>x.status==='complete').map(x=>x.id),skipped:[...(saved.skipped||[])]};
}
export function skipGettingStarted(s,id,undo=false){
 if(!gettingStartedSteps.some(step=>step.id===id))throw Error('Unknown getting started step.');
 rememberGettingStarted(s);
 const skipped=new Set(s.settings.gettingStarted.skipped);if(undo)skipped.delete(id);else skipped.add(id);
 s.settings.gettingStarted.skipped=[...skipped];
}
export function validateGettingStarted(s){
 const value=s.settings.gettingStarted;if(value===undefined)return;
 if(!value||typeof value!=='object')throw Error('Invalid getting started progress.');
 const ids=new Set(gettingStartedSteps.map(step=>step.id));
 if(value.hidden!==undefined&&typeof value.hidden!=='boolean')throw Error('Invalid getting started visibility.');
 if(value.reopened!==undefined&&(!value.reopened||typeof value.reopened!=='object'||Array.isArray(value.reopened)||Object.entries(value.reopened).some(([id,items])=>!ids.has(id)||!Array.isArray(items)||items.length>10000||items.some(x=>typeof x!=='string'||x.length>200))))throw Error('Invalid getting started progress.');
 if(!value||typeof value!=='object'||!['completed','skipped'].every(key=>Array.isArray(value[key])&&value[key].length<=6&&value[key].every(id=>ids.has(id))&&new Set(value[key]).size===value[key].length))throw Error('Invalid getting started progress.');
}
