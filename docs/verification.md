# Self-hosting preparation checks

Verified on 2026-10-21 with Node.js 24.9.0:

- `npm test`: 313 tests passed, including rejection of missing standalone auth configuration and removal of forged platform identity headers.
- `npm run build:self-hosted`: production bundle generated successfully. Its Worker configuration uses the standalone Worker name and browser assets, with no D1 or R2 bindings.
- `npm run build` followed by `npm run db:local`: original local preview build and all five D1 initialization migrations succeeded against a fresh disposable local database.
- Source staging excludes dependencies, generated assets, credentials, local databases, and original Git/deployment history. Known original deployment URLs/identifiers and common credential formats were scanned for; none remained in staged source.

The tests used the existing installed dependency versions. A fresh dependency install on another machine, deployment to an independent Cloudflare account, Supabase SQL/RLS execution, real signup/SMTP, and Nylas consent/send/bookings must still be verified by the installer. No production credentials or user data are included.

The original application remains separately maintained. This repository is a sanitized source snapshot with standalone deployment additions, not a fork of the author's live database.
