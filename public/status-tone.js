import {L} from './i18n.js';
// Client-facing statuses are colored by meaning: waiting on the client (warning), a problem (negative)
// or done (positive). Anything else stays neutral.
const tones={warning:['outstanding','published','awaiting response','awaiting signature','awaiting acceptance','to complete'],negative:['overdue','declined'],positive:['paid','signed','accepted','completed']};
export function statusTone(status){const s=String(status||'').toLowerCase();return Object.keys(tones).find(t=>tones[t].includes(s))||'neutral';}
// Shown in the viewer's language; the status value itself stays English.
const labels=()=>({outstanding:L('Outstanding'),published:L('Awaiting response'),'awaiting response':L('Awaiting response'),'awaiting signature':L('Awaiting signature'),'awaiting acceptance':L('Awaiting acceptance'),'to complete':L('To complete'),overdue:L('Overdue'),declined:L('Declined'),paid:L('Paid'),signed:L('Signed'),accepted:L('Accepted'),completed:L('Completed'),'for information':L('For information'),draft:L('Draft'),superseded:L('Superseded'),scheduled:L('Scheduled'),confirmed:L('Confirmed'),cancelled:L('Cancelled'),planned:L('Planned'),active:L('Active'),'in progress':L('In progress'),'on hold':L('On hold')});
export function statusLabel(status){const raw=String(status||''),known=labels()[raw.toLowerCase()];if(known)return known;return raw.charAt(0).toUpperCase()+raw.slice(1);}
