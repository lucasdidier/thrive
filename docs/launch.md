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

Production runs on `runonthrive.com`, registered with Cloudflare Registrar on November 9, 2026. Its DNS is already in the right account, and Workers, Resend and Google all verify through it.

"Thrive" is a crowded name (Thrive Global, Thrive Market, Thrive Themes, Thriveworks). Search the trademark registers for your market before you print anything.

Go to Cloudflare → runonthrive.com → Email → Email Routing and forward `hello@runonthrive.com` to your Gmail, so replies to the support address reach you. Notification emails come from `notifications@runonthrive.com` through Resend, so that address needs no mailbox.

## 2. Supabase production project

1. Create the project at supabase.com/dashboard. Name it `Thrive production`, choose an EU region (Frankfurt), and keep the database password in your password manager. Use the Pro plan: it includes daily backups with 7 days' retention, and the project never pauses.
2. In the SQL Editor, run each file in `supabase/migrations/` in name order: `202610180001_thrive.sql`, `202610190001_nylas.sql`, then `202611050001_beta.sql`.
3. Go to Authentication → Sign In / Providers. Turn **Google on** (you'll paste its keys in step 3 below) and keep **Email on** for "Email me a code". In the Email provider, set **Email OTP length** to 6. Thrive never offers passwords in the beta; the server only accepts Google or a code for an invited email.
4. Go to Authentication → URL Configuration. Set Site URL to `https://runonthrive.com` and add the redirect URL `https://runonthrive.com/auth/callback`.
5. Put the project reference (from Settings → General) into `SUPABASE_URL` in `wrangler.production.jsonc`.
6. Invite yourself in the SQL Editor: `insert into thrive_beta_invites(email) values ('owner@example.com');`

## 3. Google sign-in

This is identity only. Gmail and Calendar keep going through Nylas.

1. In console.cloud.google.com, create a project called `Thrive`.
2. Go to Google Auth Platform → Branding. Set app name `Thrive`, logo `docs/brand/thrive-google-consent-120.png`, home page `https://runonthrive.com`, privacy policy `https://runonthrive.com/privacy`, terms `https://runonthrive.com/terms`, and add `runonthrive.com` as an authorized domain.
3. Under Audience, choose External.
4. Under Data Access, keep only `openid`, `email` and `profile`. These are non-sensitive, so you only need brand verification (a few days) and no security assessment.
5. Under Clients → Create client → Web application:
   - Authorized JavaScript origin: `https://runonthrive.com`.
   - Authorized redirect URIs: `https://runonthrive.com/auth/google/callback` (Thrive's own return) and `https://PROJECT-REF.supabase.co/auth/v1/callback` (the fallback, removable once the first works).
6. Paste the client ID and secret into Supabase → Google provider. Supabase uses them to accept the ID token Thrive hands over.
7. Put the same client ID in `GOOGLE_CLIENT_ID` (wrangler.production.jsonc vars) and store the secret on the Worker:
   `cd ~/Documents/Code/Thrive/prototype && PATH=~/.asdf/installs/nodejs/24.9.0/bin:$PATH npx wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.production.jsonc`
   With both set, Google returns to runonthrive.com instead of Supabase. Without the secret, sign-in falls back to Supabase's hosted redirect, so removing it is the rollback.
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
- **Nylas:** reuse the sandbox app (5 connections in total across staging and production), and add `https://runonthrive.com/api/nylas/callback` to its Hosted authentication callback URLs.
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

## Running the beta

- **Invite someone:** insert their email into `thrive_beta_invites` (Table Editor → Insert row). Within the hour they get the "You're invited" email.
- **See requests:** open the `thrive_beta_requests` table. To accept one: `insert into thrive_beta_invites(email) select email from thrive_beta_requests where email = 'name@example.com';`
- **Revoke access:** delete their invite row. The trigger removes their access at once.
- **Errors:** you get at most one email per error type per hour. The full logs are in Cloudflare → Workers → thrive-production → Logs.
- **Limits:**
  - Access requests: 3 per minute per IP address.
  - Sign-in, client responses, form posts and error reports: 30 per minute per IP address.
