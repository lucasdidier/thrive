import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import './sites-env.mjs';

// Disposable local D1 preview only. Hosted Supabase uses its own SQL files.
for (const file of readdirSync('drizzle').filter(f => /^\d+.*\.sql$/.test(f)).sort()) {
  const result = spawnSync(process.execPath, [
    'node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local',
    '--config', 'dist/server/wrangler.json', '--persist-to', '.wrangler/state',
    '--file', `drizzle/${file}`,
  ], {stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
