import {defaultDocumentDesign} from './document-design.js';
export function workspaceBranding(s,design={}){const brand=defaultDocumentDesign(s);return {...brand,...design,...Object.fromEntries(['color','logo','issuerDetails','footer','titleFont'].map(k=>[k,brand[k]]))};}
export function refreshDraftBranding(s){for(const d of [...s.documents.filter(d=>d.status==='draft'),...(s.invoiceDrafts||[])])d.design=workspaceBranding(s,d.design);}
