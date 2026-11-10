# Launching the closed beta

Thrive runs twice on Cloudflare:

| | Staging | Production |
|---|---|---|
| Worker | `thrive` (workers.dev) | `thrive-production` (your domain) |
| Config | `wrangler.self-hosted.jsonc` | `wrangler.production.jsonc` |
| Supabase | Thrive staging | Thrive production (new) |
| Who signs in | You only (`THRIVE_OWNER_EMAIL`) | Anyone, with Google or an emailed code (`THRIVE_ACCESS=open`; `invite` limits it to `thrive_beta_invites`) |
| Deploy | `npm run build:self-hosted && npm run deploy:self-hosted` | `npm run build:production && npm run deploy:production` |

`npm run check:production` lists every placeholder still to fill. The production build refuses to run until there are none.

Every command below is one line you can paste from any folder.

## 1. The domain

Production runs on `runonthrive.com` (the marketing site) and `app.runonthrive.com` (the app, `THRIVE_APP_URL`), registered with Cloudflare Registrar on November 9, 2026. Its DNS is already in the right account, and Workers, Resend and Google all verify through it.

"Thrive" is a crowded name (Thrive Global, Thrive Market, Thrive Themes, Thriveworks). Search the trademark registers for your market before you print anything.

Go to Cloudflare → runonthrive.com → Email → Email Routing and forward `hello@runonthrive.com` to your Gmail, so replies to the support address reach you. Notification emails come from `notifications@runonthrive.com` through Resend, so that address needs no mailbox.

## 2. Supabase production project

1. Create the project at supabase.com/dashboard. Name it `Thrive production`, choose an EU region (Frankfurt), and keep the database password in your password manager. Use the Pro plan: it includes daily backups with 7 days' retention, and the project never pauses.
2. In the SQL Editor, run each file in `supabase/migrations/` in name order: `202610180001_thrive.sql`, `202610190001_nylas.sql`, then `202611050001_beta.sql`.
3. Go to Authentication → Sign In / Providers. Turn **Google on** (you'll paste its keys in step 3 below) and keep **Email on** for "Email me a code". In the Email provider, set **Email OTP length** to 6. Thrive never offers passwords in the beta; the server only accepts Google or a code for an invited email.
4. Go to Authentication → URL Configuration. Set Site URL to `https://app.runonthrive.com` and add the redirect URL `https://app.runonthrive.com/auth/callback`.
5. Put the project reference (from Settings → General) into `SUPABASE_URL` in `wrangler.production.jsonc`.
6. Invite yourself in the SQL Editor: `insert into thrive_beta_invites(email) values ('owner@example.com');`

## 3. Google sign-in

This is identity only. Gmail and Calendar keep going through Nylas.

1. In console.cloud.google.com, create a project called `Thrive`.
2. Go to Google Auth Platform → Branding. Set app name `Thrive`, logo `docs/brand/thrive-google-consent-120.png`, home page `https://runonthrive.com`, privacy policy `https://runonthrive.com/privacy`, terms `https://runonthrive.com/terms`, and add `runonthrive.com` as an authorized domain.
3. Under Audience, choose External.
4. Under Data Access, keep only `openid`, `email` and `profile`. These are non-sensitive, so you only need brand verification (a few days) and no security assessment.
5. Under Clients → Create client → Web application:
   - Authorized JavaScript origin: `https://app.runonthrive.com`.
   - Authorized redirect URIs: `https://app.runonthrive.com/auth/google/callback` (Thrive's own return) and `https://PROJECT-REF.supabase.co/auth/v1/callback` (the fallback, removable once the first works).
6. Paste the client ID and secret into Supabase → Google provider. Supabase uses them to accept the ID token Thrive hands over.
7. Put the same client ID in `GOOGLE_CLIENT_ID` (wrangler.production.jsonc vars) and store the secret on the Worker:
   `cd ~/Documents/Code/Thrive/prototype && PATH=~/.asdf/installs/nodejs/24.9.0/bin:$PATH npx wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.production.jsonc`
   With both set, Google returns to app.runonthrive.com instead of Supabase. Without the secret, sign-in falls back to Supabase's hosted redirect, so removing it is the rollback.
8. Brand verification needs every authorized domain to be one you can verify in Search Console, so the list must end up as `runonthrive.com` only: remove the `supabase.co` and old Sites entries once step 7 works, and give staging's Google client its own Cloud project.
9. Click **Publish app**, then submit brand verification. Until it's approved, Google's account chooser says "to continue to" the redirect's domain instead of "Thrive", but sign-in works.

## 4. Resend (notification emails)

1. Sign up at resend.com, then go to Domains → Add domain, enter `runonthrive.com` and pick the region **eu-west-1**.
2. Click **Auto configure** to add the DNS records through Cloudflare, or copy them into Cloudflare DNS yourself. Wait until the domain shows as Verified.
3. Go to API Keys → Create. Choose Sending access, limited to your domain.
4. Store the key on both Workers:
   - `cd ~/Documents/Code/Thrive/prototype && npx wrangler secret put RESEND_API_KEY --config wrangler.production.jsonc`
   - `cd ~/Documents/Code/Thrive/prototype && npx wrangler secret put RESEND_API_KEY --config wrangler.self-hosted.jsonc`
5. For staging, also add `"THRIVE_NOTIFICATIONS_FROM": "Thrive <notifications@runonthrive.com>"` to the `vars` in `wrangler.self-hosted.jsonc`.

Resend sends access requests, invites, error alerts, document notifications and summary emails.

It also sends the sign-in codes. Supabase's own mailer only reaches members of your Supabase team, a few times an hour, and won't let you edit templates. So:

6. In Supabase → Authentication → Emails → SMTP Settings, turn on custom SMTP: host `smtp.resend.com`, port `465`, username `resend`, password = a Resend API key, sender `notifications@runonthrive.com`, name `Thrive`.
7. In Emails → Templates, paste `supabase/templates/sign-in-code.html` into both **Magic link or OTP** and **Confirm sign up**, with the subject `{{ .Token }} is your Thrive sign-in code`.

## 5. Backups bucket

1. Create the bucket: `cd ~/Documents/Code/Thrive/prototype && npx wrangler r2 bucket create thrive-backups --location weur`
2. Keep 30 days of snapshots: `cd ~/Documents/Code/Thrive/prototype && npx wrangler r2 bucket lifecycle add thrive-backups expire-snapshots db/ --expire-days 30`

What runs every night at 03:00 UTC:
- **Database snapshot:** every Thrive table plus account emails, written to `db/YYYY-MM-DD.json.gz`.
- **Uploaded files:** form uploads copied once to `files/`, kept with no expiry. Supabase's own backups don't include Storage.

Supabase Pro takes its own daily backups as well. To check a snapshot, download it with `cd ~/Documents/Code/Thrive/prototype && npx wrangler r2 object get thrive-backups/db/2026-11-06.json.gz --remote --file ~/Downloads/thrive-backup.json.gz`.

## 6. Production secrets

Run each of these and paste the value when asked:

```
cd ~/Documents/Code/Thrive/prototype && npx wrangler secret put SUPABASE_PUBLISHABLE_KEY --config wrangler.production.jsonc
cd ~/Documents/Code/Thrive/prototype && npx wrangler secret put SUPABASE_SECRET_KEY --config wrangler.production.jsonc
cd ~/Documents/Code/Thrive/prototype && npx wrangler secret put NYLAS_API_KEY --config wrangler.production.jsonc
cd ~/Documents/Code/Thrive/prototype && npx wrangler secret put NYLAS_CLIENT_ID --config wrangler.production.jsonc
cd ~/Documents/Code/Thrive/prototype && npx wrangler secret put NYLAS_TOKEN_ENCRYPTION_KEY --config wrangler.production.jsonc
```

- **Supabase keys:** get them from the production project under Settings → API Keys.
- **Nylas:** reuse the sandbox app (5 connections in total across staging and production), and add `https://app.runonthrive.com/api/nylas/callback` to its Hosted authentication callback URLs.
- **Encryption key:** for `NYLAS_TOKEN_ENCRYPTION_KEY`, generate a new value with `openssl rand -base64 32`.

## 7. Legal pages

Fill the bracketed placeholders in `ui/privacy.html` and `ui/terms.html`:
- your legal name and address
- your support email
- the Supabase and Resend regions you chose
- the country and city for governing law

Have a lawyer read them before you take payments.

## 8. Deploy and check

1. Deploy: `cd ~/Documents/Code/Thrive/prototype && PATH=~/.asdf/installs/nodejs/24.9.0/bin:$PATH npm run build:production && PATH=~/.asdf/installs/nodejs/24.9.0/bin:$PATH npm run deploy:production`
2. Open `https://runonthrive.com` in a private window. You should see the landing page.
3. Submit the request form with a second email. You should receive the "Beta request" email.
4. Sign in with Google as yourself. Your empty workspace opens.
5. Sign out, then use "Email me a code" with your address. The email shows a 6-digit code; entering it opens the same workspace.
6. Try an uninvited Google account, then an uninvited email. Google lands you on the page with "isn't on the beta list yet"; the email form says the same and sends nothing.

## 9. AI assistant sign-in (MCP)

Lets Claude, ChatGPT, Cursor and Codex connect to `https://app.runonthrive.com/mcp` with a browser sign-in. Supabase issues the tokens; Thrive shows the consent page. Thrive notices within five minutes when this is turned on; there's nothing to deploy.

1. In Supabase (production project), go to Authentication → URL Configuration and check that the Site URL is `https://app.runonthrive.com`.
2. Go to Authentication → OAuth Server. Turn on the OAuth 2.1 server, allow dynamic client registration (assistants register themselves), and set the Authorization Path to `/oauth/consent`.
3. Check that `https://vacyeyashxsekeitkrcg.supabase.co/.well-known/oauth-authorization-server/auth/v1` and, a few minutes later, `https://app.runonthrive.com/.well-known/oauth-protected-resource` both return JSON.
4. In Claude (Settings → Connectors → Add custom connector), add `https://app.runonthrive.com/mcp`. Sign in to Thrive when asked, click **Allow access**, then ask Claude to read your workspace.

To switch it off again without touching Supabase, set `"THRIVE_MCP_OAUTH": "off"` in the Worker vars. Staging works the same way with its own Supabase project and Site URL.

## 10. Free trial and billing (Paddle)

Thrive Cloud: every new account gets a 7-day trial without a card, then subscribes through Paddle. Thrive keeps the trial itself (`thrive_subscriptions`); Paddle only sees people who subscribe. It stays off until `THRIVE_BILLING` is `"paddle"`, and self-hosted installs never see it.

- **Plans:** $10 a month (`PADDLE_PRICE_ID`) or $100 a year (`PADDLE_YEARLY_PRICE_ID`, optional). Plan & billing and the lock screen offer both, with the yearly saving worked out from the two prices. Subscribers switch in Plan & billing: Paddle shows what's charged today (or the credit left over) before the switch, and prorates the unused time.
- **During the trial:** a banner over the workspace shows the days left and the end date. Email and calendar sync, and the booking pages that need them, wait for a paid plan, because each connected account costs about $2 a month with Nylas. A trial sees **See plans** instead of **Connect**. An account connected before the trial started keeps working. Once an account has been locked for 30 days, the hourly job disconnects its email & calendar accounts (and drops the synced email copies) so Nylas stops billing for them.
- **Trial emails** (from `THRIVE_NOTIFICATIONS_FROM`, hourly job): trial started, 3 days left, last day, trial ended. They need `RESEND_API_KEY`.
- **When the trial ends:** the app shows a lock screen with **Subscribe**, **Download your data** and **Sign out**. Every signed-in API call answers 402, including MCP. Client links, forms and booking pages keep working. Summary emails stop.
- **Subscribing:** Paddle's checkout opens on top of Thrive. Access opens as soon as Thrive confirms the payment with Paddle; the webhook keeps it current after that. **Account settings › Plan & billing › Manage billing** opens Paddle's portal, where people change their card, see invoices or cancel.
- **Free access:** the admin (`THRIVE_ADMIN_EMAIL`) is never locked. For anyone else, set `comped` to `true` on their row. To extend a trial, change `trial_ends_at`.

### Set up on staging first (Paddle sandbox)

Sandbox checkouts work on any domain and take test cards, so staging is where to try the whole flow. Staging has no admin email, so your own account gets the trial.

1. In the staging Supabase SQL Editor, run `supabase/migrations/202611100001_subscriptions.sql`.
2. In the Paddle sandbox (`sandbox-vendors.paddle.com`), go to Catalog → Products → New product. Name it "Thrive Cloud" with the tax category "Standard digital goods". Add a price of $10, billed monthly, with no trial (Thrive runs the trial), and a second one of $100, billed annually. Set the maximum quantity of each to 1. Copy both price IDs (`pri_…`).
3. Settings (`/settings/authentication`) → Developer tools → Authentication:
   - Create a **client-side token** (`test_…`).
   - Create an **API key** (`pdl_sdbx_apikey_…`) with read access to transactions, subscriptions and prices, and write access to subscriptions (switching monthly ↔ yearly) and customer portal sessions.
4. Events → Notifications → New destination:
   - URL: `https://thrive.lucas-didier-3b9.workers.dev/api/billing/webhook`.
   - Events: every `subscription.*` event.
   - Copy its secret key (`pdl_ntfset_…`).
5. Checkout → Checkout settings: set the **Default payment link** to `https://thrive.lucas-didier-3b9.workers.dev/checkout`.
6. In `wrangler.self-hosted.jsonc`, set `"THRIVE_BILLING": "paddle"`, `PADDLE_CLIENT_TOKEN` (the `test_…` token), `PADDLE_PRICE_ID` (monthly) and `PADDLE_YEARLY_PRICE_ID`. All are public values.
7. Store the two secrets, pasting each when asked:
   `cd ~/Documents/Code/Thrive/prototype && PATH=~/.asdf/installs/nodejs/24.9.0/bin:$PATH npx wrangler secret put PADDLE_API_KEY --config wrangler.self-hosted.jsonc`
   `cd ~/Documents/Code/Thrive/prototype && PATH=~/.asdf/installs/nodejs/24.9.0/bin:$PATH npx wrangler secret put PADDLE_WEBHOOK_SECRET --config wrangler.self-hosted.jsonc`
8. Deploy staging, then check:
   - **The trial:** the sidebar shows "7 days left", and Account settings › Plan & billing shows the free trial.
   - **Subscribe:** pay with card `4242 4242 4242 4242`, any future expiry date and CVC `100`. The page reloads and Plan & billing shows "Thrive Cloud · Renews …". Then try **Manage billing**.
   - **The lock:** on a second account (or after canceling in the portal), set `trial_ends_at` to yesterday in the Table Editor and reload. The lock screen appears. **Download your data** still works.

### Go live (production)

1. In the live Paddle account, go to Settings → Website approval. Submit `runonthrive.com` and `app.runonthrive.com`; each needs its own approval. Paddle checks for pricing (the landing page's Pricing section), terms with a refund policy (`/terms#refunds`), a privacy policy and a contact email, all of which are in place.
2. Once approved, repeat steps 2–5 in the live account:
   - The webhook URL is `https://app.runonthrive.com/api/billing/webhook`.
   - The default payment link is `https://app.runonthrive.com/checkout`.
   - The token starts with `live_` and the key with `pdl_live_apikey_`.
3. Run the migration in the production Supabase project.
4. **People who joined during the free beta:** the terms promise them 30 days' notice before any charge. Before you switch billing on, give every existing account 30 days in the production SQL Editor. Their "trial started" email then names the date.
   `insert into thrive_subscriptions(owner_id, email, trial_ends_at) select 'supabase:' || id, lower(email), now() + interval '30 days' from auth.users where email is not null on conflict (owner_id) do update set trial_ends_at = greatest(thrive_subscriptions.trial_ends_at, excluded.trial_ends_at);`
5. Set the four values in `wrangler.production.jsonc`. Store the secrets with `--config wrangler.production.jsonc`, then deploy. `npm run check:production` refuses a billing config without a token or price ID.

## Running the beta

- **Invite someone:** insert their email into `thrive_beta_invites` (Table Editor → Insert row). Within the hour they get the "You're invited" email.
- **See requests:** open the `thrive_beta_requests` table. To accept one: `insert into thrive_beta_invites(email) select email from thrive_beta_requests where email = 'name@example.com';`
- **Revoke access:** delete their invite row. The trigger removes their access at once.
- **Errors:** you get at most one email per error type per hour. The full logs are in Cloudflare → Workers → thrive-production → Logs.
- **Limits:**
  - Access requests: 3 per minute per IP address.
  - Sign-in, client responses, form posts and error reports: 30 per minute per IP address.
