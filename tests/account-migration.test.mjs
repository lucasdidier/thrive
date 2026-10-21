import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAccountMigration} from '../server/account-migration.mjs';
import {encodeState} from '../server/store.mjs';
const req=(body={},token='secret')=>new Request('https://thrive.test/api/account-migration',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
test('migration is disabled without its secret, after cutover, and for unauthorized callers',async()=>{
 const DB={prepare(){throw Error('Must not access data');}};
 for(const env of [{DB},{DB,THRIVE_MIGRATION_KEY:'secret',THRIVE_AUTH_MODE:'supabase'}])assert.equal((await handleAccountMigration(req(),env)).status,404);
 assert.equal((await handleAccountMigration(req({},'wrong'),{DB,THRIVE_MIGRATION_KEY:'secret'})).status,404);
});
test('migration inspection is read only and requires exactly one source',async()=>{
 const state=await encodeState({clients:[{id:'c1'}]});let sources=[{owner_id:'old-owner',revision:31}];
 const DB={prepare(sql){return {bind(){return this;},async all(){return {results:sql.includes('FROM workspaces')?sources:[]};},async first(){return {state,revision:31,updated_at:'now'};}};}};
 const env={DB,THRIVE_MIGRATION_KEY:'secret'};
 const r=await handleAccountMigration(req({action:'inspect'}),env);assert.equal(r.status,200);assert.equal((await r.json()).counts.clients,1);
 assert.equal((await handleAccountMigration(req({action:'migrate',sourceOwner:'wrong',expectedRevision:31}),env)).status,409);
 sources.push({owner_id:'someone-else',revision:0});assert.equal((await handleAccountMigration(req({action:'inspect'}),env)).status,409);
});
