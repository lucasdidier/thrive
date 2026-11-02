import test from 'node:test';
import assert from 'node:assert/strict';
import {selfHostedFetch} from '../server/self-hosted.mjs';

test('public deployment fails closed without Supabase auth and storage', async () => {
  for (const env of [{}, {THRIVE_AUTH_MODE:'preview'}, {THRIVE_AUTH_MODE:'supabase'}, {THRIVE_DATA_BACKEND:'supabase'}]) {
    const response = await selfHostedFetch({fetch(){assert.fail('must not dispatch');}}, new Request('https://thrive.example.com/api/workspace', {headers:{'oai-authenticated-user-id':'forged'}}), env, {});
    assert.equal(response.status, 503);
  }
});

test('public deployment strips platform identity but preserves Supabase auth and body', async () => {
  const env = {THRIVE_AUTH_MODE:'supabase', THRIVE_DATA_BACKEND:'supabase'};
  const request = new Request('https://thrive.example.com/api/workspace', {method:'POST',headers:{
    'oai-authenticated-user-id':'forged', 'oai-authenticated-user-email':'forged@example.com',
    'oai-authenticated-user-full-name':'Forged', 'authorization':'Bearer user-token',
    'cookie':'thrive-auth=session', 'origin':'https://thrive.example.com',
  }, body:'payload'});
  const ctx = {};
  const response = await selfHostedFetch({async fetch(clean, actualEnv, actualCtx){
    assert.equal([...clean.headers.keys()].some(k=>k.startsWith('oai-authenticated-user-')), false);
    assert.equal(clean.headers.get('authorization'),'Bearer user-token');
    assert.equal(clean.headers.get('cookie'),'thrive-auth=session');
    assert.equal(clean.headers.get('origin'),'https://thrive.example.com');
    assert.equal(await clean.text(),'payload');
    assert.equal(actualEnv,env); assert.equal(actualCtx,ctx);
    return new Response('ok');
  }}, request, env, ctx);
  assert.equal(await response.text(),'ok');
});
