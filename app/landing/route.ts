import landing from '../../ui/landing.html?raw';
import {env} from 'cloudflare:workers';
// The landing page at /landing on every deployment, so staging can preview it. Production also
// shows it at / to signed-out visitors; this copy is kept out of search results.
export function GET(){
 const html=landing.replaceAll('hello@thrive.example',String(env.THRIVE_SUPPORT_EMAIL||'hello@thrive.example'));
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
}
