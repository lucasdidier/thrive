# Self-hosting Thrive

Every installation uses its own accounts and resources. Examples use `https://thrive.example.com`; replace that with your own final HTTPS origin everywhere. No author-owned deployment, database, OAuth client, or grant is needed.

## 1. Pick an installation mode

**Local preview:** follow the root README. It uses local D1/R2 emulation and a loopback-only mock identity. No external account is required. The mock identity is absent from production builds.

**Hosted installation:** the supported standalone configuration uses Cloudflare Workers and Supabase Auth, PostgreSQL, and Storage. One user can use it, or multiple users can have separate workspaces. There is no shared-team permissions model. The public worker deliberately rejects configurations without Supabase auth and storage.

**Optional no-login hosting:** conceptually appropriate only on a private device/network, but it is not implemented as a production mode in this release. Do not disable authentication on a public worker or inject identity headers from a browser. A private single-owner adapter and its access controls would need to be implemented and tested first.

Cloudflare Workers is the recommended target because the existing routes import `cloudflare:workers`. Cloudflare provides HTTPS for Workers; use its Workers domain or attach your own domain. If you later use a separate origin behind Cloudflare, configure TLS to the origin too. Static Pages alone cannot run these server routes. See [Cloudflare Vite deployment](https://developers.cloudflare.com/workers/vite-plugin/get-started/) and [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## 2. Create your Supabase project

1. Create a new project in your own [Supabase dashboard](https://supabase.com/dashboard). Use separate development and production projects.
2. In its SQL editor, apply these files **once, in order**, to the new project:
   - `supabase/migrations/202610180001_thrive.sql`
   - `supabase/migrations/202610190001_nylas.sql`
3. Verify the `thrive_*` tables exist and RLS is enabled. The first migration also creates the **private** `thrive-files` Storage bucket. Do not make it public or add broad client-write policies. Business writes run through the server and service-only RPCs.
4. From project settings, obtain the project URL, publishable key, and server secret key. Legacy `anon` and `service_role` keys are also accepted through `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` respectively.
5. Keep the secret/service-role key exclusively on the server. Never put it in `public/`, frontend code, an MCP client, or a `VITE_*`/`NEXT_PUBLIC_*` variable.

These SQL files are initialization migrations, not repeatable reset scripts. Existing installations need an explicit migration plan and backup; do not rerun the first migration or replace an existing database.

### Authentication

1. Enable email/password authentication in Supabase. Keep email confirmation enabled for real accounts.
2. Under Authentication → URL Configuration, set Site URL to your exact final origin. Add these redirect URLs:

   ```text
   https://thrive.example.com/auth/callback
   https://thrive.example.com/auth/callback?next=reset-password
   ```

3. Configure your own SMTP service for reliable confirmation and recovery emails. Supabase's default email service has restrictions; verify delivery to the addresses that will use the app.
4. For confirmation links that also work when opened in another browser, use this link in the signup confirmation email template:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
   ```

   Use `type=recovery` in the password recovery template. Thrive asks the recipient to continue before consuming the token. Default PKCE email links must be opened in the browser that started the flow. Keep confirmation URL tokens out of logs and analytics.
5. For a personal installation, create your account, verify sign-in, then disable new signups in Supabase if you do not want others to register. Public client links and forms use their individual share tokens independently of account signup.

Optional social sign-in is separate from Nylas:

- **Google:** configure the Google provider in Supabase using your own Google OAuth web client. Register the Supabase project's callback URL shown in the provider dashboard with Google. Then set `THRIVE_GOOGLE_LOGIN=true`.
- **Microsoft:** configure Supabase's Azure provider using your own Entra app registration. Choose the intended account audience, register the Supabase callback, and follow its verified-email guidance. Then set `THRIVE_MICROSOFT_LOGIN=true`.

Leave both flags `false` until the providers work. Signing into Thrive with Google/Microsoft does **not** grant access to email or calendars.

References: [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Google login](https://supabase.com/docs/guides/auth/social-login/auth-google), [Azure login](https://supabase.com/docs/guides/auth/social-login/auth-azure).

## 3. Configure Cloudflare Workers

Install dependencies with Node.js 22.13+ (24 recommended):

```sh
npm run install:ci
npm test
```

Edit `wrangler.self-hosted.jsonc`:

- Set `name` to a unique Worker name in your account.
- Set `THRIVE_APP_URL` to your final HTTPS origin (no path/query).
- Set `SUPABASE_URL` to your Supabase project URL.
- Keep `THRIVE_AUTH_MODE=supabase` and `THRIVE_DATA_BACKEND=supabase`.
- Set `NYLAS_REDIRECT_URI` to that same origin plus `/api/nylas/callback` if using Nylas.
- Keep social-login flags false unless configured.

This file holds nonsecret settings only. The standalone configuration has no D1/R2 binding requirement: Supabase stores workspace data and private uploads. The original Vite config with placeholder D1/R2 resources is for preview/Sites, not independent production deployment.

Authenticate the Cloudflare CLI, build, and deploy:

```sh
npx wrangler login
npm run build:self-hosted
npm run deploy:self-hosted
```

The first deployment intentionally cannot serve accounts until its keys are configured. Add the two server variables through interactive prompts; paste each key only into its prompt:

```sh
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY --config wrangler.self-hosted.jsonc
npx wrangler secret put SUPABASE_SECRET_KEY --config wrangler.self-hosted.jsonc
```

Wrangler targets the Worker name in that config. If you use legacy key types, substitute their supported variable names from section 2. Do not put secret values on a command line that will be saved in shell history.

Attach the custom domain in Cloudflare's Workers settings, or use the assigned `https://<worker>.<account-subdomain>.workers.dev` URL. If the final URL differs from the placeholder, update `THRIVE_APP_URL`, Nylas callback, and Supabase Site URL/redirect URLs, then rebuild and redeploy. Always deploy the generated `dist/server/wrangler.json`; it includes the bundled Worker and browser assets. Rebuild after changing the source configuration. Worker secrets persist separately.

Use HTTPS end to end. Supabase sessions use HttpOnly, Secure, SameSite cookies on HTTPS. Do not cache authenticated APIs, auth responses, or client-link responses in a separate CDN rule.

### Local testing with real Supabase authentication

```sh
cp .dev.vars.example .dev.vars
# Edit .dev.vars with credentials for a separate development project.
npm run dev:self-hosted -- --port 5173
```

Use `http://127.0.0.1:5173` consistently, including Supabase development redirect URLs and `THRIVE_APP_URL`. Add the two local callback URLs from the auth section with that origin. `.dev.vars` is ignored by Git and is loaded by the Cloudflare Vite plugin; it is not deployed as production secrets. Use this command for real auth testing, not `npm run dev`, which uses the original preview configuration.

## 4. Optional Nylas email, calendar, and scheduling

Skip this section to use CRM, projects, documents, invoices, forms, time, and workflows without live communications. The supplied config selects Nylas but leaves credentials absent, so connections remain unavailable until configured.

1. Create your own [Nylas account/application](https://dashboard.nylas.com/). Start with a sandbox and your own test mailbox. Select US or EU and use that region consistently with the application/API key.
2. Obtain the application's client ID and API key. Never reuse another installation's credentials or grant ID.
3. In Nylas Hosted Authentication settings, register your exact Thrive callback:

   ```text
   https://thrive.example.com/api/nylas/callback
   ```

4. Configure a Google and/or Microsoft connector in Nylas using the provider credentials and consent setup required for your application. In the provider's OAuth console, use the **Nylas callback URL shown by its connector setup**; this is distinct from the Thrive callback above and from the Supabase login callback.
5. Grant the capabilities Thrive actually checks:

   | Provider | Email | Calendar |
   | --- | --- | --- |
   | Google | `gmail.readonly` plus `gmail.send` | `calendar.events` plus `calendar.readonly` (also covers calendar listing for booking publication) |
   | Microsoft | `Mail.Read` plus `Mail.Send` | `Calendars.ReadWrite` |

   Google names above refer to `https://www.googleapis.com/auth/<scope>`. Provider/Nylas setup may require additional identity/offline scopes. The adapter also accepts Google's broader `gmail.modify`/full mail and `calendar` scopes; use only permissions needed for your features. Check provider requirements and Nylas's current production onboarding process before connecting other users.
6. In `wrangler.self-hosted.jsonc`, set:

   ```text
   THRIVE_COMMUNICATIONS_PROVIDER=nylas
   NYLAS_REGION=eu
   NYLAS_ENVIRONMENT=sandbox
   NYLAS_REDIRECT_URI=https://thrive.example.com/api/nylas/callback
   ```

   Choose `us` if your application uses US. Changing `NYLAS_ENVIRONMENT` to `production` does not upgrade your Nylas account or remove provider restrictions; complete Nylas production setup first.
7. Generate a persistent 32-byte base64 encryption key locally:

   ```sh
   openssl rand -base64 32
   ```

   Save it in a password manager and use it below. Do not commit it or regenerate it on every build.
8. Add the three values interactively as Worker secrets:

   ```sh
   npx wrangler secret put NYLAS_CLIENT_ID --config wrangler.self-hosted.jsonc
   npx wrangler secret put NYLAS_API_KEY --config wrangler.self-hosted.jsonc
   npx wrangler secret put NYLAS_TOKEN_ENCRYPTION_KEY --config wrangler.self-hosted.jsonc
   npm run build:self-hosted
   npm run deploy:self-hosted
   ```

9. Sign into your own Thrive account. Open **Settings → Connections**, choose Google or Microsoft, and consent to email/calendar access. The server stores the resulting grant for that Thrive owner. Google/Microsoft sign-in alone does not establish this connection.
10. Test message refresh with a test client whose email is in your mailbox. Review a saved draft before sending to a recipient you control. Test calendar availability and an invitation/cancellation with your own test address.
11. For public booking links, configure availability and an event type in **Scheduling**, then **Publish booking page**. This uses Nylas Scheduler and needs a writable primary calendar and suitable Nylas account capabilities. Open the resulting `book.nylas.com` URL to verify timezone, availability, booking, cancellation, and rescheduling. Bookings/invitations appear in the connected calendar; don't assume every external booking becomes a Thrive CRM record without testing that flow.

Sandbox sends and invitations can reach real recipients. Each installer is responsible for their own provider connection limits, usage, and fees. No background webhook synchronization is provisioned by these instructions; mail refresh and calendar/booking actions follow the implemented UI/API behavior.

References: [Nylas hosted authentication](https://developer.nylas.com/docs/v3/auth/hosted-oauth-apikey/), [Google provider setup](https://developer.nylas.com/docs/provider-guides/google/), [Microsoft provider setup](https://developer.nylas.com/docs/provider-guides/microsoft/), [Scheduler quickstart](https://developer.nylas.com/docs/v3/scheduler/).

## 5. Verify before relying on it

- Sign up, confirm email, sign out, sign back in, and recover a password.
- Create a client/project; reload and verify persistence in another browser.
- Verify a second account cannot read or edit the first account's workspace.
- In a signed-out browser, verify workspace APIs and data-bearing MCP calls are denied. Supplying `oai-authenticated-user-*` headers must not grant access.
- Test one intended public form/document/portal link and one private upload, then revoke the link and verify denial. Public client links are bearer capabilities: anyone with a valid link can use it.
- Test enabled Nylas features with your own mailbox/calendar. Don't send test messages or invitations to real clients.
- Set up backups for Supabase database and Storage objects, and retain the encryption key. Database backups alone do not replace Storage-object backups. Verify restoration in a separate project.

`npm test` uses local/mock adapters; it does not prove your external credentials or production RLS deployment work. `tests/accounts-postgres.sql` checks real PostgreSQL permissions and atomicity, but must run only on an isolated test project with the required Supabase roles/schema. Account email delivery, OAuth, and external booking need live verification in your own accounts.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Redirects to `/signin-with-chatgpt` on your hosted site | Wrong build/config was deployed. Use `build:self-hosted` and `deploy:self-hosted`. |
| “Configure Supabase…” / account service unavailable | Auth/backend flags, project URL, both keys, and migrations. |
| Missing table or RPC | Both Supabase migrations must be applied to the same project used by the Worker. |
| Auth redirect/cookie problems | Exact origin, HTTPS, Supabase Site URL/allowlist, and browser used for PKCE flow. |
| Missing confirmation/reset email | SMTP setup, sender restrictions, and Supabase email logs. |
| Nylas unavailable | All four credential/callback fields, matching region, and provider connector setup. |
| OAuth callback mismatch | Distinguish Thrive→Nylas, provider→Nylas, and provider→Supabase callback URLs. |
| Booking publication fails | Connected calendar permissions, a writable primary calendar, and Nylas Scheduler availability. |
| Local migration reports “already exists” | The fresh database initialization was already run; do not delete real data to fix it. |
| Another runtime cannot import `cloudflare:workers` | This code targets Workers; another server requires a runtime/binding adapter. |

## Updates, data ownership, and agent access

Back up before updates, review migrations, then run tests/build and deploy. Existing workspaces use compressed snapshots with revision checks; concurrent writes are detected rather than automatically merged. Do not copy an author's database or import the same snapshot into multiple new accounts.

The `/mcp` endpoint accepts a **Supabase user access token** in `Authorization: Bearer <token>` for protected calls. Never use the service-role key there. Tokens expire and need client-side refresh. Clients that require full OAuth discovery/account linking need further integration; copying the endpoint alone does not implement it.

For agent-assisted installation, use [the setup prompt](agent-setup.md).
