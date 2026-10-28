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
export function gettingStartedProgress(s,connection){
 const saved=s.settings.gettingStarted||{},completed=new Set([...(saved.completed||[]),...observedSteps(s,connection)]);
 return gettingStartedSteps.map(step=>({...step,status:completed.has(step.id)?'complete':saved.skipped?.includes(step.id)?'skipped':'pending'}));
}
export function rememberGettingStarted(s,connection){
 const saved=s.settings.gettingStarted||{};
 s.settings.gettingStarted={completed:[...new Set([...(saved.completed||[]),...observedSteps(s,connection)])],skipped:[...(saved.skipped||[])]};
}
export function skipGettingStarted(s,id,undo=false){
 if(!gettingStartedSteps.some(step=>step.id===id))throw Error('Unknown getting started step.');
 rememberGettingStarted(s);
 const skipped=new Set(s.settings.gettingStarted.skipped);if(undo)skipped.delete(id);else skipped.add(id);
 s.settings.gettingStarted.skipped=[...skipped];
}
export function validateGettingStarted(s){
 const value=s.settings.gettingStarted;if(value===undefined)return;
 const ids=new Set(gettingStartedSteps.map(step=>step.id));
 if(!value||typeof value!=='object'||!['completed','skipped'].every(key=>Array.isArray(value[key])&&value[key].length<=6&&value[key].every(id=>ids.has(id))&&new Set(value[key]).size===value[key].length))throw Error('Invalid getting started progress.');
}
