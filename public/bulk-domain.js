import {archiveClient,archiveProject} from './domain.js';
import {archiveDocument,toggleForm} from './workspace-domain.js';
import {archiveTimeEntry,timeStatus,timeClaim,entryRate} from './time-domain.js';
import {deleteInvoiceDraft} from './invoice-domain.js';
import {validateWorkflow} from './workflow-domain.js';

// Selection is scoped to the visible view. Hidden rows never remain selected.
export function createSelection(){let scope='',active=false,visible=[],selected=new Set();return {
 use(next,ids){if(scope!==next){scope=next;active=false;selected.clear();}visible=[...new Set(ids)];selected=new Set([...selected].filter(id=>visible.includes(id)));},
 get active(){return active;},get ids(){return [...selected];},get count(){return selected.size;},get total(){return visible.length;},get all(){return visible.length>0&&selected.size===visible.length;},get mixed(){return selected.size>0&&selected.size<visible.length;},has:id=>selected.has(id),
 start(){active=true;selected.clear();},stop(){active=false;selected.clear();},clear(){selected.clear();},toggle(id,checked){if(!active||!visible.includes(id))return;if(checked)selected.add(id);else selected.delete(id);},selectAll(checked=true){if(active)selected=new Set(checked?visible:[]);}
 };}
export function bulkActions(s,scope,rows){const has=rows.length>0,all=fn=>has&&rows.every(fn),actions=[];
 if(['clients','projects','documents','proposals','contracts','forms'].includes(scope)){actions.push({id:'archive',label:'Archive',enabled:all(r=>!r.archived)},{id:'restore',label:'Restore',enabled:all(r=>r.archived)});}
 if(scope==='invoices')actions.push({id:'delete-drafts',label:'Delete drafts',enabled:all(r=>r.status==='draft'),hint:'Only invoice drafts can be deleted.'});
 if(scope==='time'){
 const singleProject=new Set(rows.map(r=>r.projectId)).size===1,invoiceable=all(r=>timeStatus(s,r)==='unbilled'&&entryRate(s,r)>0&&s.projects.some(p=>p.id===r.projectId&&!p.archived&&p.status!=='cancelled'&&s.clients.some(c=>c.id===p.clientId&&!c.archived)));
 actions.push({id:'invoice-time',label:'Create invoice draft',enabled:singleProject&&invoiceable,hint:'Choose unbilled entries from one active project, with hourly rates set.'},{id:'archive',label:'Archive',enabled:all(r=>!r.archived&&!timeClaim(s,r.id)),hint:'Entries linked to invoices cannot be archived.'},{id:'restore',label:'Restore',enabled:all(r=>r.archived&&!timeClaim(s,r.id))});
 }
 if(['workflows','meeting-types'].includes(scope)){const active=r=>scope==='workflows'?r.enabled:r.active;actions.push({id:'pause',label:'Pause',enabled:has&&rows.some(active)},{id:'enable',label:'Enable',enabled:has&&rows.some(r=>!active(r))});}
 // Avoid duplicate inverse actions when a homogeneous selection (or view) is known.
 return actions.filter(a=>has?!(['restore','enable'].includes(a.id)&&!a.enabled&&actions.some(x=>['archive','pause'].includes(x.id)&&x.enabled))&&!(['archive','pause'].includes(a.id)&&!a.enabled&&actions.some(x=>['restore','enable'].includes(x.id)&&x.enabled)):!['restore','enable'].includes(a.id));
}
export function applyBulkAction(s,scope,ids,action){if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Select records first.');const next=structuredClone(s),source=scope==='workflows'?next.automation?.workflows:scope==='meeting-types'?next.scheduling?.types:scope==='invoices'?next.invoiceDrafts:next[['proposals','contracts'].includes(scope)?'documents':scope];if(!Array.isArray(source))throw Error('This bulk action is unavailable.');const rows=ids.map(id=>source.find(r=>r.id===id));if(rows.some(r=>!r))throw Error('Some selected records are no longer available.');
 const normalized=rows.map(r=>scope==='forms'?{...r,archived:r.status==='archived'}:scope==='invoices'?{...r,status:'draft'}:r);if(!bulkActions(next,scope,normalized).some(a=>a.id===action&&a.enabled)||action==='invoice-time')throw Error('This action is not available for every selected record.');
 for(const r of rows){if(action==='delete-drafts')deleteInvoiceDraft(next,r.id);else if(scope==='clients')archiveClient(next,r.id);else if(scope==='projects')archiveProject(next,r.id);else if(['documents','proposals','contracts'].includes(scope))archiveDocument(next,r.id);else if(scope==='forms')toggleForm(next,r.id);else if(scope==='time')archiveTimeEntry(next,r.id,action==='archive');else if(scope==='workflows'){if(action==='enable')validateWorkflow(next,r);r.enabled=action==='enable';}else if(scope==='meeting-types')r.active=action==='enable';}
 Object.assign(s,next);return rows.length;
}
export function selectionCSV(columns,rows){const cell=value=>{let text=value==null?'':Array.isArray(value)?value.join(', '):String(value);if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};return '\ufeff'+[columns.map(c=>cell(c[1])).join(','),...rows.map(r=>columns.map(([key])=>cell(r[key])).join(','))].join('\r\n');}
