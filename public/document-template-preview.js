import {createDocument} from './workspace-domain.js';
import {allTemplates} from './document-defaults.js';
import {documentPaper} from './document-paper.js';

// Preview the selected structure without adding records or billing links to the workspace.
export function documentTemplatePreview(state,data){
 const draft=createDocument(structuredClone(state),data),template=allTemplates(state).find(t=>t.id===data.templateId),client=state.clients.find(c=>c.id===draft.clientId);
 const fill=value=>value.replaceAll('{{business}}',state.settings.business).replaceAll('{{client}}',client.name);
 const content=template?{scope:fill(template.scope),deliverables:fill(template.deliverables),terms:fill(template.terms)}:{scope:'Your content will appear here.',deliverables:'',terms:''};
 const pricing=draft.showPricing!==false?`<section class="doc-section template-pricing-placeholder"><h2>${draft.selectionMode==='single'?'Choose your package':draft.selectionMode==='multiple'?'Choose your services':'Services & pricing'}</h2></section>`:'';
 return {name:template?.name||`Blank ${data.kind||'document'}`,html:documentPaper({...draft,...content,business:state.settings.business,client},{pricing}),currency:draft.currency};
}
