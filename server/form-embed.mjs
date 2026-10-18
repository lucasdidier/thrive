import {resolveShare} from './sharing.mjs';

// Only this form-only document can be framed. Workspace and document sharing
// retain their own access controls; no cross-origin write permission is added.
export async function embeddedFormPage(db,token,html){
 try{const {link}=await resolveShare(db,token);if(link.entity!=='form')throw Error('Not a form.');}
 catch{return new Response('This form is unavailable. Contact the website owner.',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors https: http:; form-action 'self'"}});
}
