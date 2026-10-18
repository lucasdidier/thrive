import {validShareToken} from './share-domain.js';

const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function embedOptions({theme='light',accent='#42685b',label='Contact me'}={}){
 return {theme:['light','dark','auto'].includes(theme)?theme:'light',accent:/^#[\da-f]{6}$/i.test(accent)?accent:'#42685b',label:String(label).trim().slice(0,80)||'Contact me'};
}
export function formEmbedSnippet(origin,token,options={}){
 const base=new URL(origin);if(!['https:','http:'].includes(base.protocol)||base.username||base.password||!validShareToken(token))throw Error('A valid form link is required.');
 const {theme,accent,label}=embedOptions(options),url=`${base.origin}/share/${token}`;
 return `<!-- Add the script once, then place this link wherever you want a button. -->\n<script src="${escapeHTML(base.origin)}/embed.js" defer></script>\n<a href="${escapeHTML(url)}" data-thrive-form data-thrive-theme="${theme}" data-thrive-accent="${accent}">${escapeHTML(label)}</a>`;
}
