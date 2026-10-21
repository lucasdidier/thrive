# Coding-agent setup prompt

Copy the block below into your coding agent while working in this repository. Replace the bracketed preferences. Use your own accounts, not the author's deployment.

```text
Help me set up my own Thrive instance from https://github.com/lucasdidier/thrive.
Clone into a new directory if needed; preserve any existing checkout and data.

My target: [local preview / Cloudflare Workers with Supabase]
My domain: [my HTTPS domain / use my workers.dev domain]
Live communications: [none / Nylas Google / Nylas Microsoft / both]
Account access: [just me / separate workspaces for multiple users]

Read README.md, docs/self-hosting.md, package.json, the runtime/auth code,
wrangler.self-hosted.jsonc, and both Supabase migrations before changing anything.
Use the existing application and domain rules.

1. Inspect the environment and install with npm run install:ci using Node 22.13+
   (24 recommended). Keep the lockfile; don't upgrade packages unnecessarily.
2. For a local-only preview, build with npm run build, initialize a NEW local
   database with npm run db:local, and bind npm run dev to 127.0.0.1. No Supabase
   or Nylas account is required. Do not expose the development mock identity.
3. For hosted use, configure my own Cloudflare Worker and Supabase project. Use
   vite.self-hosted.config.ts and wrangler.self-hosted.jsonc. Keep both auth and
   backend in supabase mode. Run the migrations once, in order, on a new project.
   Preserve RLS, private storage, user verification, owner scoping, optimistic
   concurrency, idempotency, and the worker's rejection of platform identity
   headers. Do not deploy the legacy Sites config as a public standalone app.
4. Configure the exact HTTPS origin, Supabase email/password auth and callbacks,
   confirmation/recovery templates, and SMTP. Enable social-login flags only
   after their provider setup works. For personal use, help me disable new
   signups after my account exists. Don't claim that one user makes a public
   no-login app safe; a production private single-owner mode is not implemented.
5. If I requested communications, configure my own Nylas application, region,
   hosted-auth callback and Google/Microsoft connectors. Follow the permissions
   in the setup guide, including calendar listing for booking pages. Generate
   and securely retain my encryption key. Supabase login is separate from Nylas
   mailbox/calendar consent. Never reuse someone else's grant ID.
6. Put local credentials only in ignored .dev.vars and hosted credentials in
   Cloudflare secrets. Have me enter secrets through secure prompts/settings;
   don't request them in chat, print them, embed them in frontend assets, or
   commit them. Never use a service-role key as an MCP user's bearer token.
7. Run npm test and npm run build:self-hosted. Verify the generated Worker config
   has my Worker name and no author-owned resources. Use the generated config
   for deployment. Request only missing account access or decisions; don't
   invent credentials, domains, account identities, or completed live tests.
8. Verify signup, confirmation, recovery, sign-out, persistence, cross-account
   isolation, and signed-out denial of private APIs. Check a public share link
   and revocation. If enabled, verify Nylas connection, refresh, availability,
   invitations, and a booking page using my test addresses. Do not contact real
   clients or publish booking pages until those actions are authorized.
9. Document the final URL, settings names (no secret values), verification
   results, unresolved issues, and backup/update steps. Distinguish local tests
   from live checks. Don't change repository visibility or choose a license
   without my instruction.

Ask only for missing information that blocks the next step and continue any
independent work. Consult current official provider documentation if dashboard
steps or platform behavior differ from the guide.
```
