import html from '../../ui/checkout.html?raw';
import {env} from 'cloudflare:workers';
// Paddle's "Default payment link" (Checkout settings): https://app.runonthrive.com/checkout. Paddle sends
// customers here with ?_ptxn= for payments it starts itself; in-app checkouts open as an overlay instead.
export function GET(){
 const token=/^(test|live)_[A-Za-z0-9]+$/.test(String(env.PADDLE_CLIENT_TOKEN||''))?String(env.PADDLE_CLIENT_TOKEN):'';
 return new Response(html.replace('__PADDLE_TOKEN__',token),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'}});
}
