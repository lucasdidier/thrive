import {rateLimited,tooMany,reportError} from './guard.mjs';
// Outside Sites, identity headers are untrusted. Never fall back to that mode
// when a public deployment is missing its Supabase configuration.
export async function selfHostedFetch(handler, request, env, ctx) {
  if (env.THRIVE_AUTH_MODE !== 'supabase' || env.THRIVE_DATA_BACKEND !== 'supabase') {
    return new Response('Configure Supabase authentication and storage before serving Thrive.', {
      status: 503,
      headers: {'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8'},
    });
  }
  if (await rateLimited(request, env)) return tooMany();
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
  }
  const path = new URL(request.url).pathname;
  const alert = (details) => { const p = reportError(env, {source: 'server', path, ...details}).catch(() => {}); ctx?.waitUntil?.(p); return p; };
  try {
    const response = await handler.fetch(new Request(request, {headers}), env, ctx);
    if (response.status >= 500) alert({status: response.status, message: await response.clone().text().then(t => t.slice(0, 300)).catch(() => '')});
    return response;
  } catch (error) {
    alert({message: error?.message || 'Unhandled error', stack: error?.stack});
    return new Response('Something went wrong. Please try again.', {status: 500, headers: {'Cache-Control': 'no-store'}});
  }
}
