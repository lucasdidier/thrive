// Client-facing statuses are colored by meaning: waiting on the client (warning), a problem (negative)
// or done (positive). Anything else stays neutral.
const tones={warning:['outstanding','published','awaiting response','awaiting signature','awaiting acceptance','to complete'],negative:['overdue','declined'],positive:['paid','signed','accepted','completed']};
export function statusTone(status){const s=String(status||'').toLowerCase();return Object.keys(tones).find(t=>tones[t].includes(s))||'neutral';}
export function statusLabel(status){const s=status==='published'?'Awaiting response':String(status||'');return s.charAt(0).toUpperCase()+s.slice(1);}
