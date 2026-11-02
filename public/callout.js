// Shared information callout: one look for every in-context note.
// Tones: info (default), positive, warning, negative. Body may be HTML the caller escaped.
import {icon} from './app-icons.js';
const glyphs={info:'info',positive:'check',warning:'info',negative:'info'};
export function callout({title='',body='',tone='info',role='note',id='',extra=''}={}){
 return `<div class="callout callout--${tone}" role="${role}"${id?` id="${id}"`:''}>${icon(glyphs[tone]||'info','callout-icon')}<div class="callout-body">${title?`<strong class="callout-title">${title}</strong>`:''}${body}${extra}</div></div>`;
}
