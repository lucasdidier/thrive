import {documentLayouts,validateDocumentDesign} from './document-design.js';
import {workspaceBranding} from './workspace-branding.js';
import {expandableCard} from './expandable-card.js';
export function createDocumentBranding({getState:S,dialog,esc,btn,icon,refresh}){let design;
 function start(d){design=workspaceBranding(S(),d.design);}
 function controls(){const layouts=`<div class="invoice-template-grid doc-layout-grid">${documentLayouts.map(t=>`<button type="button" class="template-card ${design.template===t.id?'selected':''}" data-action="doc-layout" data-template="${t.id}" aria-pressed="${design.template===t.id}"><span class="template-mini mini-${t.id}" style="--invoice-accent:${design.color}" aria-hidden="true"><i class="mini-brand"></i><i class="mini-title"></i><i class="mini-rule"></i><i class="mini-lines"></i><i class="mini-total"></i></span><strong>${esc(t.name)}</strong></button>`).join('')}</div>`;return `<section class="document-branding">${expandableCard('Document layout',esc(documentLayouts.find(t=>t.id===design.template)?.name||'Choose a layout'),layouts,{open:true})}<button type="button" class="branding-link text-btn" data-action="doc-branding">Customize workspace branding ${icon('external')}</button><p class="hint">Your draft is saved before opening settings. Workspace branding applies to all drafts.</p></section>`;}
 function capture(){return validateDocumentDesign(workspaceBranding(S(),design));}
 function click(a,el){if(a!=='doc-layout')return false;design.template=el.dataset.template;const host=dialog.querySelector('.document-branding');const expanded=host.querySelector('details').open;host.outerHTML=controls();dialog.querySelector('.document-branding details').open=expanded;refresh();return true;}
 return {start,controls,capture,click,change:()=>{}};
}
