import {normalizedProjectStatus} from './project-status.js';
export function upgradeProjects(s){
 if(!s?.settings||!Array.isArray(s.projects))return s;
 delete s.settings.phases;
 if(s.automation?.workflows){const retired=s.automation.workflows.filter(w=>(w.triggers||[]).some(t=>t.type.startsWith('phase.'))||(w.steps||[]).some(t=>t.type.startsWith('phase.')));if(retired.length){s.retiredWorkflows=[...(s.retiredWorkflows||[]),...retired];s.automation.workflows=s.automation.workflows.filter(w=>!retired.includes(w));}}
 for(const w of s.automation?.workflows||[]){for(const t of w.triggers||[])if(t.type==='project.status_changed'&&t.filter?.value)t.filter.value=normalizedProjectStatus(t.filter.value);for(const a of w.steps||[])if(a.type==='project.status'&&a.config?.status)a.config.status=normalizedProjectStatus(a.config.status);}
 for(const p of s.projects||[]){p.status=normalizedProjectStatus(p.status);delete p.phases;upgradePlan(p);}
 for(const d of s.documents||[]){delete d.phases;upgradePlan(d);}
 return s;
}
function upgradePlan(record){record.billingPlan=(record.billingPlan||[]).map((r,i)=>{const next={...r,trigger:r.trigger||(i===0?'acceptance':'manual')};delete next.phaseId;return next;});}
