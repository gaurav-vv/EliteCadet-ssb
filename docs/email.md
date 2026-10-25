# Email (invites and password reset)

The app never sends email itself. **Supabase Auth** sends every auth email (mentor and student
invites, password reset, signup confirmation) through whatever SMTP server the Supabase project
uses. If the API says "sent", Auth accepted the email and handed it to that SMTP server. That isn't
proof it reached an inbox.

## Local development: emails go to Mailpit, never to real inboxes

The local stack (`npx supabase start`) has **no outgoing SMTP**. Auth sends every email to the
bundled **Mailpit** catcher:

- Open **http://127.0.0.1:54324** to see every invite and reset email, whoever it was addressed
  to. Nothing reaches Gmail or any other real mailbox, by design.
- Mailpit keeps messages **only until the Supabase containers restart**. Anything sent earlier is
  gone.
- Links in these emails point at `http://127.0.0.1:54321/auth/v1/verify…` and then the app on
  `http://localhost:3000`, so open them on the same machine.

When the app is connected to a local stack, every "Invite sent" or "Check your email" message
adds a line, **"Local development: this email was not sent to a real inbox"**, with a link to
Mailpit. It never appears against a hosted project.

### Is my email actually going anywhere? (diagnose in 1 minute)

1. **Which Supabase is the app using?** Look at the `NEXT_PUBLIC_SUPABASE_URL` line in
   `.env.local`. `http://127.0.0.1:54321` means local (Mailpit); `https://….supabase.co` means
   hosted (see below).
2. **Is Mailpit running?** Run `npx supabase status`. Mailpit is the **Mailpit URL** /
   `supabase_inbucket_…` service. The "Stopped services" list (realtime, storage, imgproxy,
   edge runtime, analytics, vector, pooler) has nothing to do with email.
3. **Did Auth accept the request?** Run
   `docker logs supabase_auth_elitecadet-ssb --since 1h | grep -E '"path":"/(invite|recover)"'`.
   - `200` means the email was generated and captured.
   - `422 email_exists` means the invite was refused because that email already has an account
     (the app says so).
   - `429` means rate-limited.
   - No line at all means the request never reached this Supabase. Check that you're using this
     app at `http://localhost:3000`.
4. **Open Mailpit** (http://127.0.0.1:54324) and search for the address.

### Try it

1. **Mentor invite:** sign in as an academy admin → Mentors → *Invite a mentor* → Send invite. In
   Mailpit, open "You've been invited" and click the link. You should land on **Set a new
   password**. Save it, then log in with the new password; you arrive at `/mentor`.
2. **Independent mentor:** sign in as a super admin → User Management → *Invite an independent
   mentor*. Same steps; the mentor dashboard says "You're an independent mentor".
3. **Password reset:** `/forgot-password` → enter the account's email → in Mailpit open "Reset
   your password" → the link opens **Set a new password** → save → log in.
4. **Bad links:** opening the same link again, a link older than 1 hour, or an edited link shows
   "This reset link has expired" (or "invalid, expired or already used" for resets), with a way
   to request a new one.

Automated: `E2E_BASE_URL=http://localhost:3000 E2E_MAILPIT_URL=http://127.0.0.1:54324 npx playwright test tests/e2e/auth-flows-local.spec.ts`
(add the local `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the environment for
the independent-mentor test, e.g. `set -a; . ./.env.local; set +a` first).

### Real emails while developing locally (optional)

Add a real SMTP provider to `supabase/config.toml` (`[auth.email.smtp]`, see the commented
example in that file). Use an `env(...)` reference for the password, never the literal value.
Then restart with `npx supabase stop && npx supabase start`.

## Hosted Supabase (staging / production): custom SMTP is required

Supabase's built-in email service is for trying things out only. It sends **only to members of
your Supabase organization** and is heavily rate-limited, so invites to real mentors and reset
emails to real students won't arrive. Before inviting real people:

The SMTP password lives **only in the Supabase dashboard**. It never goes in `.env.local`, this
repo or the browser. The app doesn't need it, because Supabase Auth sends the email.

### Step 1: get SMTP credentials from an email provider

Pick one. You need five values: **host, port, username, password, sender address**.

| Option | Good for | What to do | Values |
|---|---|---|---|
| **Resend** (recommended) | dev and production | Sign up at resend.com → Domains → add and verify your domain (it gives you DNS records: SPF, DKIM) → API Keys → create a key | host `smtp.resend.com`, port `465`, username `resend`, password = the API key, sender `no-reply@<your verified domain>` |
| Postmark, Amazon SES, SendGrid, Brevo | production | Verify your domain (SPF + DKIM, add DMARC), create SMTP credentials | from the provider's SMTP page |
| **Gmail with an app password** | quick personal testing only (≈500 emails/day, may be flagged as spam) | Google account → Security → turn on 2-Step Verification → *App passwords* → create one for "Mail" | host `smtp.gmail.com`, port `465`, username = your full Gmail address, password = the 16-character app password, sender = the same Gmail address |

**Without a domain you own, you can't send to arbitrary people through Resend.** Its shared test
sender `onboarding@resend.dev` only delivers to the email address that owns the Resend account. A
successful test email to yourself proves the Resend account works, **not** that mentors or students
will receive anything. Other providers have the same rule: sending as `you@gmail.com` or another
domain you don't control is refused or lands in spam (SPF/DKIM/DMARC fail).

What reliable delivery to any address needs (manual steps only you can do):
1. **Own a domain** (any registrar; a cheap one is fine, e.g. `elitecadet.in`).
2. In **Resend → Domains → Add domain**, add it (or a subdomain such as `mail.elitecadet.in`).
   Resend shows DNS records.
3. At your registrar's **DNS settings**, add exactly those records: the **SPF** (TXT) record, the
   **DKIM** (TXT/CNAME) records, and optionally the MX record for bounces. Add a **DMARC** TXT record
   at `_dmarc.<domain>`, e.g. `v=DMARC1; p=none;`.
4. Wait until Resend shows the domain as **Verified** (minutes to a day).
5. Use a sender on that domain, e.g. `no-reply@<domain>`, in Step 2 below.

Until then, for **testing only**: use your own inbox (the Resend account's address) as the test
account, or the Gmail app-password option above, which can reach other inboxes in small numbers but
isn't suitable for production.

### Step 2: enter them in Supabase

Supabase dashboard → your project → **Authentication → Emails → SMTP Settings** → turn on
**Enable custom SMTP** → fill in sender email, sender name (e.g. `EliteCadet`), host, port,
username and password → **Save**.

Also in **Authentication → Emails** (or Providers → Email), turn on **Secure password change**
for production. Supabase then refuses a password change from a session that isn't recent (the
user must re-authenticate). The app already lets only reset/invite-link sessions use the "Set a new
password" page, and this is the matching server-side control.

### Step 3: allow your app's addresses

**Authentication → URL Configuration:**
- **Site URL**: where this project's users open the app. For a development project used from your
  computer, `http://localhost:3000`. For production, `https://<your-app-domain>`.
- **Redirect URLs**: add `http://localhost:3000/**` (development) and/or
  `https://<your-app-domain>/**`, plus any preview domains. The reset link returns to
  `<the site you asked from>/auth/callback`, so that origin must be listed. If it isn't, Supabase
  falls back to the Site URL. The app forwards such a link (`/?code=…`) to the callback, which
  sends an email-link session to "Set a new password", but the Site URL must still be the right site.

Keep development and production as **separate Supabase projects** (each with its own Site URL,
SMTP sender and keys) rather than one project serving both.

### Step 4: make reset links work from any device (recommended)

By default the reset email's link uses PKCE: it only works in **the same browser that asked for
the reset**, because that browser holds a one-time secret (a cookie). If someone requests the reset
on a laptop and taps the link in the Gmail app on their phone, they'll see "This link has expired
or was already used".

To make the link work anywhere: **Authentication → Emails → Templates → Reset Password**, replace
the link with:

```html
<h2>Reset your password</h2>
<p>Someone asked to reset the password for your EliteCadet account. If it was you, choose a new one:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Set a new password</a></p>
<p>This link works once and expires in 1 hour. If you didn't ask for this, you can ignore this email.</p>
```

The app already handles this link (`/auth/callback` verifies the token on the server). It uses the
**Site URL**, so Step 3's Site URL must be right. It doesn't depend on the Redirect URL list.
Verified on the local stack (2026-10-25): a PKCE reset's `pkce_…` token hash verifies from a
different browser with no verifier cookie, and that session can set the new password.

### Step 5: rate limits

**Authentication → Rate Limits → "Rate limit for sending emails"**: the built-in service allows
only a couple per hour. With custom SMTP, set it to what you need (e.g. 30–100 per hour). Resets
are also limited per address: **one per 60 seconds** by default.

## Test a password reset with your real inbox (step by step)

Before you start: the app must use the hosted project (`NEXT_PUBLIC_SUPABASE_URL` in `.env.local` is
`https://<project>.supabase.co`), and Steps 1–3 above must be done. You need an account that
**already exists** in that project, with the email you can read.

1. In the Supabase dashboard → **Authentication → Users**, find your email, to confirm the account
   exists there. Don't create a new one.
2. Restart the app: stop `npm run dev` (Ctrl+C) and run `npm run dev` again. Open
   **http://localhost:3000/forgot-password**. Use the same address that's in the Site URL and
   Redirect URLs.
3. Type your email → **Send reset link**. You should see "Check your email". If you see an error
   instead, open the browser console (F12 → Console). The `[auth] password reset request failed`
   line has a `hint` saying what to fix.
4. Open your inbox (wait up to a minute; check **Spam** and **Promotions**). Open the newest
   "Reset your password" email.
5. Click the link. Without Step 4's template, open it **in the same browser** you used in step 2
   (on a computer, copy the link into that browser if your mail opens a different one).
6. You land on **Set a new password**. Type a new password (8+ characters) → **Save new
   password**.
7. You're sent to the login page with "Your password has been updated". Log in with your email and
   the **new** password. You arrive at your dashboard. The old password no longer works.
8. **Expired/used link:** click the same email link again. You should see the reset form with
   "That reset link is invalid, expired or already used. Request a new one below." Request
   another one from there.

If no email arrives: Supabase dashboard → **Logs → Auth** (look for `/recover`) and your SMTP
provider's sending log (Resend → Emails). The provider log is the only proof an email was
delivered or bounced.

## Adding mentors: invite by email or add manually

Academy → **Mentors → Add a mentor** offers two methods:

| | Invite by email | Add manually |
|---|---|---|
| Sends an email | Yes (Supabase Auth invite) | **No**, so it works without SMTP |
| Creates | the mentor's account + profile, with no password yet | the mentor's account + profile, with **no password** |
| Can they log in? | Only after opening the link and choosing a password | **No.** Later, use **Send invite** in the list; they accept and choose a password |
| Details | name, email | name, email, phone, qualifications, specialization |

Why "account + profile" in both cases: every EliteCadet profile belongs to a Supabase Auth user
(`profiles.id` → `auth.users`). A manually added mentor's user has **no password** and an
unconfirmed email, so nobody can sign in as them. The only way in is through their own inbox: an
invite, or a password-reset link once SMTP works. That's what activates the account. There are no
default passwords.

**Status in the list:** *Active* · *Added — not invited (can't log in)* · *Invite pending* ·
*Invite expired* · *Suspended*. The status comes from Supabase Auth (`invited_at`,
`confirmation_sent_at`, `email_confirmed_at`, `last_sign_in_at`).
- **Expiry:** Supabase enforces it. The list calls an invite *expired* after
  `INVITE_LINK_TTL_SECONDS` (3600 s, in `lib/server/academy-people/validation.ts`). It must match
  Supabase → Authentication → Emails → **Email OTP Expiration** (default 3600 s). If you change one,
  change the other. *Resend* sends a fresh link and restarts the clock. Links work **once**.
- **Revoke / Remove** (never-activated mentors only) deletes that account, so its link stops
  working immediately and the profile leaves your academy and batches. You can invite them again.
  Mentors who already activated can't be revoked; the platform team suspends them instead.
- **Duplicates:** an email that's already one of your mentors is refused ("already one of your
  mentors"). An email with any other account is refused without saying whose it is.
- **Failures are failures:** if the email service refuses or SMTP is down, the admin sees an
  error, never "sent". Supabase's built-in mailer refusing a non-team address says to set up SMTP.
- **Who can do it:** only an active academy admin, for their own academy, checked on the server
  for every action. The service role is used only after that check. Every add, invite, resend and
  revoke is written to `audit_log`.
- **Needs:** `SUPABASE_SERVICE_ROLE_KEY` on the server (both methods), custom SMTP (invites only,
  see above), and migration `0027_mentor_onboarding.sql`.

## Inviting someone who already has an account

Supabase Auth only **re-sends** an invite to an address that hasn't accepted yet. It never changes
that account's role or academy. Before 2026-10-20 this meant inviting an address that already had
a pending *student* invite (or another academy's invite) as a mentor showed **"Invite sent"**,
while the person would still join as a student or in the other academy. The server now checks
first (`decideInvite`, `findAccountByEmail`):

| Existing account | Academy admin inviting a mentor | Super admin inviting an independent mentor |
|---|---|---|
| none | invite sent | invite sent |
| pending invite, **same** role and academy | invite **re-sent** ("re-sent" message) | invite **re-sent** |
| already active as that mentor | refused: "already a mentor in your academy — they can log in or use Forgot password" | refused: "already an independent mentor" |
| any other role or academy (pending or active) | refused: "already has an EliteCadet account — ask the platform team" (no details about other academies) | refused, naming the role, with a pointer to their user page |

Failures show an actionable message (missing service key, rate limit, email service not set up).
The server logs only the error code and HTTP status, never the address or a token.

## How the flows work (and why they're safe)

- **Invite:**
  - Server action → service checks the role (an academy admin can invite only into their own
    academy; a super admin can invite independent mentors) → `auth.admin.inviteUserByEmail` with
    the **service-role key**, which exists only on the server.
  - The signup trigger trusts the invite's role and academy only because `invited_at` is set,
    which only the service role can do. A browser signup claiming "mentor" becomes a student.
  - The link verifies a one-time token, then lands on `/reset-password#access_token=…`.
  - The page adopts the session and immediately removes the tokens from the address bar.
- **Reset:**
  - `/forgot-password` → `resetPasswordForEmail` (PKCE).
  - Default link: `/auth/callback?code=…`, which exchanges the code on the server using the
    verifier cookie of the browser that asked for the reset (so: same browser only).
  - With the Step 4 template: `/auth/callback?token_hash=…&type=recovery`, verified on the server
    with `verifyOtp` (any device).
  - Either way, a session created by a reset or invite (the token's `amr` claim) goes to
    `/reset-password`, even if the link lost its `next`. A link Supabase sent to the Site URL
    root (`/?code=…`) is forwarded to `/auth/callback` by the proxy.
  - Saving the new password signs the user out, and they log in with the new password.
  - The page always says "if an account exists…", so it doesn't reveal which emails have
    accounts.
- **Links:** single use; expire after 1 hour (`otp_expiry` / Supabase default). A used, expired
  or tampered link fails safely.
