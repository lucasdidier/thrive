import html from '../../../ui/auth.html?raw';
import {env} from 'cloudflare:workers';
import {landingURL} from '../../../server/hosts.mjs';
// The logo leads to the landing page (runonthrive.com in production), not back into the app.
const page=()=>html.replace('<a href="/" class="brand"',`<a href="${landingURL(env)}" class="brand"`);
export async function GET(_request:Request,context:{params:Promise<{view:string}>}){if(!['sign-in','sign-up','forgot-password','reset-password','confirm'].includes((await context.params).view))return new Response('Not found',{status:404});return new Response(page(),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'"}});}
