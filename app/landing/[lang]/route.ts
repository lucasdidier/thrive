import {landingResponse} from '../handler';
export async function GET(request:Request,context:{params:Promise<{lang:string}>}){return landingResponse(request,(await context.params).lang);}
