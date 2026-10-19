import {env} from 'cloudflare:workers';
import {handleAccountMigration} from '../../../server/account-migration.mjs';
export const POST=(request:Request)=>handleAccountMigration(request,env);
