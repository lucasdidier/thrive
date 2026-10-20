export const documentLabel = record => ({proposal:'Proposal',contract:'Contract',agreement:'Proposal + contract'})[record?.kind] || 'Document';

// Older activity has only a title. Resolve it conservatively, without rewriting
// the stored event or its notification read marker.
export function documentActivityPresentation(state, event) {
 if (!event.documentId && !/^(Document|Proposal|Contract)\b/.test(event.text || '')) return {text:event.text,kind:event.kind};
 const records = state?.documents || [];
 const linked = event.documentId && records.find(d => d.id === event.documentId);
 const matches = records.filter(d => d.title === event.detail || d.versions?.some(v => v.title === event.detail));
 const kinds = new Set(matches.map(d => d.kind));
 const kind = event.documentKind || linked?.kind || (kinds.size === 1 ? matches[0]?.kind : null);
 const label = documentLabel({kind});
 const text = /^Document\b/.test(event.text || '') ? event.text.replace(/^Document\b/, label) : event.text;
 const iconKind = kind || (/^Proposal \+ contract\b/.test(text) ? 'agreement' : /^Contract\b/.test(text) ? 'contract' : /^Proposal\b/.test(text) ? 'proposal' : event.kind);
 return {text, kind:iconKind};
}
