// Counts a page view on the public pages (landing, blog, sign-in) without cookies or identifiers:
// the path, the language, where the visitor came from (the referring site's name and utm_* tags) and
// whether this is the first page in this tab's session. server/visits.mjs stores it.
(()=>{
 try{
  if(navigator.webdriver||/^(localhost|127\.)/.test(location.hostname))return;
  const q=new URLSearchParams(location.search),first=!sessionStorage.getItem('thrive-visit');
  sessionStorage.setItem('thrive-visit','1');
  let ref='';try{const r=new URL(document.referrer);if(r.hostname&&!r.hostname.endsWith('runonthrive.com')&&r.hostname!==location.hostname)ref=r.hostname.replace(/^www\./,'');}catch{}
  const body=JSON.stringify({path:location.pathname,lang:document.documentElement.lang||'',ref,source:q.get('utm_source')||'',medium:q.get('utm_medium')||'',campaign:q.get('utm_campaign')||'',device:matchMedia('(max-width: 760px)').matches?'mobile':'desktop',first});
  navigator.sendBeacon?.('/visit',new Blob([body],{type:'text/plain'}));
 }catch{}
})();
