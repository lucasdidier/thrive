import {env} from 'cloudflare:workers';
import {handlePaddleWebhook} from '../../../../server/subscription.mjs';
// Paddle notification destination: https://app.runonthrive.com/api/billing/webhook (signed, no session).
export const POST=(request:Request)=>handlePaddleWebhook(request,env);
