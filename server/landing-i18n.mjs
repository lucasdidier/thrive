// The landing page in Thrive's languages. The English page (ui/landing.html) stays the source; each
// language is a map from English text to its translation (content/landing/<lang>.json), keyed by the
// text as the browser shows it (entities decoded, surrounding spaces trimmed). The server translates the
// HTML so search engines and first paint get the language; public/landing-i18n.js translates what the
// demo scripts render afterwards. scripts/landing-extract.mjs lists the strings to translate.
const ATTRS=['aria-label','alt','title','placeholder'];
const decode=s=>String(s).replace(/&(amp|lt|gt|quot|#39|nbsp);/g,(m,e)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'",nbsp:' '}[e]));
const encodeText=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const encodeAttr=s=>encodeText(s).replace(/"/g,'&quot;');
// Worth translating: has letters, isn't a URL, email, file name or code-ish token.
export const translatable=s=>{const t=s.trim();return t.length>1&&/\p{L}{2}/u.test(t)&&!/^(https?:|www\.|[\w.-]+@[\w.-]+|[\w-]+\.(com|js|css|svg|png|webp|txt|example)\b)/i.test(t)&&!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(t)&&!/[{}=;`\\]|\$\{|'\]|^[.#[]/.test(t);};
const PROTECTED=/<(script|style|svg)\b[\s\S]*?<\/\1>/gi;

// Splits HTML into protected blocks (script, style, svg) and the rest.
function eachChunk(html,fn){let out='',last=0;for(const m of html.matchAll(PROTECTED)){out+=fn(html.slice(last,m.index))+m[0];last=m.index+m[0].length;}return out+fn(html.slice(last));}

export function landingStrings(html,scripts=[]){
 const seen=new Set(),list=[];
 const add=raw=>{const t=decode(raw).trim();if(translatable(t)&&!seen.has(t)){seen.add(t);list.push(t);}};
 eachChunk(html,part=>{
  const head=/^([^<]+)</.exec(part);if(head)add(head[1]);
  for(const m of part.matchAll(/>([^<]+)</g))add(m[1]);
  for(const m of part.matchAll(new RegExp(`\\s(?:${ATTRS.join('|')})="([^"]*)"`,'g')))add(m[1]);
  for(const m of part.matchAll(/<meta\s+(?:name="description"|property="og:(?:title|description)")\s+content="([^"]*)"/g))add(m[1]);
  return part;
 });
 for(const src of scripts){
  // Text between tags in template literals, split around ${…}; attribute labels; quoted UI labels.
  for(const m of src.matchAll(/>([^<>`]+)</g))for(const piece of m[1].split(/\$\{[^}]*\}/))if(!/[(){}]/.test(piece))add(piece);
  for(const m of src.matchAll(new RegExp(`(?:${ATTRS.join('|')})="([^"$]+)"`,'g')))add(m[1]);
  for(const m of src.matchAll(/'([^'\n\\]{2,90})'/g)){const t=m[1];if(/^[A-Z\p{Lu}]|\s/u.test(t)&&!/[<>()=/{}#]|^\s|\s$|^[a-z-]+ [a-z-]+$/.test(t))add(t);}
 }
 return list;
}

const lookup=(map,raw)=>{const text=decode(raw),t=text.trim();const v=map[t];if(typeof v!=='string'||!v||v===t)return null;const lead=text.match(/^\s*/)[0],trail=text.match(/\s*$/)[0];return lead+v+trail;};
export function translateHTML(html,map){
 if(!map||!Object.keys(map).length)return html;
 return eachChunk(html,part=>part
  .replace(/^([^<]+)(?=<)/,(m,raw)=>{const v=lookup(map,raw);return v===null?m:encodeText(v);})
  .replace(/>([^<]+)</g,(m,raw)=>{const v=lookup(map,raw);return v===null?m:'>'+encodeText(v)+'<';})
  .replace(new RegExp(`(\\s(?:${ATTRS.join('|')})=")([^"]*)"`,'g'),(m,pre,raw)=>{const v=lookup(map,raw);return v===null?m:pre+encodeAttr(v)+'"';})
  .replace(/(<meta\s+(?:name="description"|property="og:(?:title|description)")\s+content=")([^"]*)"/g,(m,pre,raw)=>{const v=lookup(map,raw);return v===null?m:pre+encodeAttr(v)+'"';}));
}
