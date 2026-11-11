import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyTurnstile,turnstileEnabled} from '../server/turnstile.mjs';
import {accountConfig} from '../server/auth.mjs';

const keys={TURNSTILE_SITE_KEY:'0x4AAAAAAAAbcdefghij',TURNSTILE_SECRET_KEY:'0x4AAAAAAAsecret'};
const answer=success=>async(url,init)=>{assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(init.body.get('secret'),keys.TURNSTILE_SECRET_KEY);return new Response(JSON.stringify({success}));};

test('Turnstile is off until both keys are set', async()=>{
 assert.equal(turnstileEnabled({TURNSTILE_SITE_KEY:keys.TURNSTILE_SITE_KEY}),false);
 assert.equal(await verifyTurnstile({},''),true);
});

test('a code request needs a valid token once Turnstile is on; errors fail closed', async()=>{
 assert.equal(await verifyTurnstile(keys,'tok',''+'1.2.3.4',{fetcher:answer(true)}),true);
 assert.equal(await verifyTurnstile(keys,'tok','',{fetcher:answer(false)}),false);
 assert.equal(await verifyTurnstile(keys,'',''),false);
 assert.equal(await verifyTurnstile(keys,'tok','',{fetcher:async()=>{throw Error('down');}}),false);
});

test('the sign-in page gets the public site key, never the secret, and its CSP allows the widget', ()=>{
 const config=accountConfig({THRIVE_AUTH_MODE:'supabase',THRIVE_ACCESS:'open',SUPABASE_URL:'https://x.supabase.co',SUPABASE_PUBLISHABLE_KEY:'pk',...keys});
 const json=JSON.stringify(config);
 assert.equal(config.emailCode,true);assert.equal(config.turnstileSiteKey,keys.TURNSTILE_SITE_KEY);
 assert.doesNotMatch(json,/secret/i);
 const route=readFileSync(new URL('../app/auth/[view]/route.ts',import.meta.url),'utf8');
 assert.match(route,/script-src 'self' https:\/\/challenges\.cloudflare\.com; frame-src https:\/\/challenges\.cloudflare\.com/);
});
