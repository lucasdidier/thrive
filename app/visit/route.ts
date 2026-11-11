import {env} from 'cloudflare:workers';
import {recordVisit} from '../../server/visits.mjs';
// Page views from public/visit.js, on the public site and the app's sign-in pages alike.
export const POST=(request:Request)=>recordVisit(request,env);
