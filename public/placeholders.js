import {L,language} from './i18n.js';
// Design-system rule: every empty text field shows a placeholder.
// Fields keep any explicit placeholder; others get an example value from their label, name or type.
const rules=[
 [/project name|^project$/i,L('Brand refresh')],
 [/business|company|client or|display name|name or business|workspace/i,'Juniper Studio'],
 [/contact|your name|full name|signer|^name$/i,'Alex Morgan'],
 [/e-?mail/i,'name@example.com'],
 [/tags?/i,L('Retainer, VIP')],
 [/service|item/i,L('Brand identity')],
 [/subject/i,L('Project update')],
 [/portal title/i,L('Client portal')],
 [/title/i,L('Project kickoff')],
 [/deposit|percent|%/i,'50'],
 [/days/i,'14'],
 [/hours?\b|duration/i,'1:30'],
 [/rate|fee|budget|amount|price/i,'0.00'],
 [/quantity|qty/i,'1'],
 [/url|link|website/i,'https://'],
 [/phone/i,'+1 555 0100'],
];
const byType={email:'name@example.com',url:'https://',tel:'+1 555 0100',number:'0'};
const textTypes=new Set(['','text','email','url','tel','search','number']);
// German capitalizes nouns, so the label keeps its first letter there.
const lower=label=>language()==='de'?label:label.charAt(0).toLowerCase()+label.slice(1);
function labelText(el){
 const label=el.getAttribute('aria-label')||[...(el.labels||[])].map(l=>{const c=l.cloneNode(true);c.querySelectorAll('input,select,textarea,small,.hint,.fluid-ui').forEach(x=>x.remove());return c.textContent;}).join(' ');
 return label.replace(/\s+/g,' ').trim();
}
export function placeholderFor(el){
 const label=labelText(el),key=`${label} ${el.name||''}`;
 if(el.tagName==='TEXTAREA')return label?L('Add {label}…',{label:lower(label)}):L('Write here…');
 const rule=rules.find(([re])=>re.test(key));
 return rule?rule[1]:byType[el.type]||(label?L('Add {label}',{label:lower(label)}):'');
}
function fill(root){
 for(const el of root.querySelectorAll?.('input:not([placeholder]),textarea:not([placeholder])')||[]){
  if(el.readOnly||el.disabled&&el.closest('.fluid-ui')||el.closest('.fluid-ui')||el.closest('[data-no-placeholder]')||(el.tagName==='INPUT'&&!textTypes.has(el.getAttribute('type')||'')))continue;
  const text=placeholderFor(el);if(text)el.placeholder=text;
 }
}
export function initPlaceholders(root=document.body){
 fill(root);
 new MutationObserver(changes=>{for(const m of changes)for(const n of m.addedNodes)if(n.nodeType===1)fill(n.matches?.('input,textarea')?n.parentElement:n);}).observe(root,{subtree:true,childList:true});
}
