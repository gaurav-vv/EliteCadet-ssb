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

1. Pick an email provider (e.g. Resend, Postmark, Amazon SES, SendGrid, Brevo) and **verify your
   sending domain** there (SPF + DKIM DNS records; add DMARC too).
2. Supabase dashboard → **Authentication → Emails → SMTP Settings → Enable custom SMTP**:
   - host, port (usually 465 or 587)
   - username and password: the provider's SMTP credentials, kept in the dashboard only, never
     in this repo
   - sender email on the verified domain (e.g. `no-reply@your-domain`) and sender name
3. **Authentication → Rate Limits:** raise "emails sent per hour" to fit your usage.
4. **Authentication → URL Configuration:**
   - **Site URL** = the app's public URL (e.g. `https://app.your-domain`).
   - **Redirect URLs** = `https://app.your-domain/**`, plus any preview domains.
   - Links pointing anywhere else fall back to the Site URL.
5. Optional: edit the Invite and Reset Password templates. Keep the `{{ .ConfirmationURL }}`
   link.
6. Send yourself an invite and a reset, and confirm both arrive. Check spam, and the provider's
   delivery log.

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
  - The link goes to `/auth/callback?code=…`, which exchanges the code on the server using the
    verifier cookie of the browser that asked for the reset, then goes to `/reset-password`.
  - The page always says "if an account exists…", so it doesn't reveal which emails have
    accounts.
- **Links:** single use; expire after 1 hour (`otp_expiry` / Supabase default). A used, expired
  or tampered link fails safely.
