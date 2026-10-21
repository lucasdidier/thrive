// Outside Sites, identity headers are untrusted. Never fall back to that mode
// when a public deployment is missing its Supabase configuration.
export function selfHostedFetch(handler, request, env, ctx) {
  if (env.THRIVE_AUTH_MODE !== 'supabase' || env.THRIVE_DATA_BACKEND !== 'supabase') {
    return new Response('Configure Supabase authentication and storage before serving Thrive.', {
      status: 503,
      headers: {'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8'},
    });
  }
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('oai-authenticated-user-')) headers.delete(name);
  }
  return handler.fetch(new Request(request, {headers}), env, ctx);
}
