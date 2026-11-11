// Translates what the landing page's demo scripts render (the server already translated the HTML;
// server/landing-i18n.mjs). The language's strings come inline in #landing-i18n; English pages have none.
const data=document.getElementById('landing-i18n');
const map=data?JSON.parse(data.textContent||'{}'):null;
const ATTRS=['aria-label','title','placeholder','alt'];
const swap=value=>{const t=value.trim(),v=map[t];if(typeof v!=='string'||!v||v===t)return null;return value.replace(t,v);};
function translate(root){
 if(root.nodeType===3){const v=swap(root.nodeValue);if(v!==null)root.nodeValue=v;return;}
 if(root.nodeType!==1||/^(SCRIPT|STYLE)$/.test(root.nodeName))return;
 for(const a of ATTRS){const value=root.getAttribute?.(a);if(value){const v=swap(value);if(v!==null)root.setAttribute(a,v);}}
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,{acceptNode:n=>n.nodeType===1&&/^(SCRIPT|STYLE)$/.test(n.nodeName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
 for(let n=walker.nextNode();n;n=walker.nextNode()){
  if(n.nodeType===3){const v=swap(n.nodeValue);if(v!==null)n.nodeValue=v;}
  else for(const a of ATTRS){const value=n.getAttribute(a);if(value){const v=swap(value);if(v!==null)n.setAttribute(a,v);}}
 }
}
if(map&&Object.keys(map).length){
 translate(document.body);
 new MutationObserver(records=>{for(const r of records){
  if(r.type==='characterData')translate(r.target);
  else if(r.type==='attributes')translate(r.target);
  else r.addedNodes.forEach(translate);
 }}).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
}
