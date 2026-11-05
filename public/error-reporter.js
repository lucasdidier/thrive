// Sends uncaught browser errors to the server, which alerts the admin. At most 3 per page load.
let left=3;
function report(message,stack){if(!left||!message)return;left--;try{navigator.sendBeacon?.('/api/errors',new Blob([JSON.stringify({message:String(message).slice(0,500),stack:String(stack||'').slice(0,2000),path:location.pathname+location.hash.split('/')[0]})],{type:'text/plain'}));}catch{}}
addEventListener('error',e=>report(e.message,e.error?.stack));
addEventListener('unhandledrejection',e=>report(e.reason?.message||e.reason,e.reason?.stack));
