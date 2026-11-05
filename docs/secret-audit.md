# Secret audit before publication

Checked on 2026-10-21 with Gitleaks 8.30.1, downloaded from its official GitHub
release and verified against its published SHA-256 checksum.

## Scope and result

- Scanned all Git history reachable from all local and fetched remote refs.
- Scanned a separate copy of the current tracked source and publication changes,
  including documentation, configuration, tests, lockfile, and vendored assets.
- Enabled archive scanning and recursive decoding; disabled inline suppression
  comments. No entire source directories or test files were exempted.
- Reviewed credential-related assignments, example settings, private-file names,
  credential-bearing URLs, and identifiers of the original private deployment.
- Checked that local `.dev.vars`/`.env`, dependency directories, build output,
  local database state, and workspace exports are excluded from tracked files.

**No live credentials or API keys were found.** The initial scan reported two
false positives in `public/free-email-domains.js`: `api.qwen3-30b-a3b.xyz` and
`meilwuzus1.xyz`. Both are domain strings in the vendored public provider list,
not credentials. `.gitleaks.toml` allows only those exact values in that exact
file; all built-in detectors remain enabled. With those reviewed exceptions,
the history and source scans pass.

Credential-like strings in tests (such as `fixture-secret`, mock bearer tokens,
deterministically generated encryption keys, and a rejected example URL using
`user:secret`) are test data. The real Nylas/Supabase credentials are read from
server environment variables; the committed `.dev.vars.example` leaves keys
empty. The original deployment URL and platform identifiers are absent from
published source and history.

## Repeat the check

Install [Gitleaks](https://github.com/gitleaks/gitleaks) from its official release
or a trusted package manager, then run from this repository:

```sh
gitleaks git . --log-opts=--all --redact --ignore-gitleaks-allow --max-archive-depth=3
gitleaks git . --pre-commit --staged --redact --ignore-gitleaks-allow
```

The second command checks staged changes before a commit; the first checks Git
history. Keep scanner reports outside the repository. Do not add broad file or
folder exclusions to silence findings: investigate each match.

This is a point-in-time audit, not a guarantee that every possible secret format
can be recognized or that future commits are safe. If a live secret is ever
committed, revoke/rotate it first; deleting it only from the latest file does not
remove it from Git history.
