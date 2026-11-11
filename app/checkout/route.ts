import html from '../../ui/checkout.html?raw';
import {env} from 'cloudflare:workers';
// Thrive's checkout page, on the public site in production (runonthrive.com/checkout, a domain Paddle has
// approved). Two ways in: the app sends people here with the plan in the #fragment (public/paddle-checkout.js),
// and Paddle's "Default payment link" sends them with ?_ptxn= for payments it starts itself.
const appURL=()=>{try{const u=new URL(String(env.THRIVE_APP_URL||''));return u.protocol==='https:'||u.hostname==='localhost'||u.hostname==='127.0.0.1'?u.origin:'';}catch{return '';}};
export function GET(){
 const token=/^(test|live)_[A-Za-z0-9]+$/.test(String(env.PADDLE_CLIENT_TOKEN||''))?String(env.PADDLE_CLIENT_TOKEN):'';
 return new Response(html.replace('__PADDLE_TOKEN__',token).replace('__APP_URL__',appURL()),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
}
