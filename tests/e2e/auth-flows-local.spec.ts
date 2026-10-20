import { test, expect, type Page } from "@playwright/test";

// Full auth flows against the LOCAL Supabase stack (`npm run dev:local`).
// Opt-in via E2E_MAILPIT_URL (e.g. http://127.0.0.1:54324): it creates
// accounts and reads their emails from the local Mailpit inbox, so it must
// never run against a real project.
const MAILPIT = process.env.E2E_MAILPIT_URL;
test.skip(!MAILPIT, "needs the local Supabase stack — set E2E_MAILPIT_URL");

const PASSWORD = "first-password-123";
const NEW_PASSWORD = "second-password-456";

function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.test`;
}

async function emailLink(to: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages } = (await search.json()) as { messages?: { ID: string }[] };
    if (messages?.length) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { HTML?: string; Text?: string };
      const href = (message.HTML ?? "").match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1] ?? (message.Text ?? "").match(/(http\S*\/auth\/v1\/verify\S*)/)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no email with a verify link arrived for ${to}`);
}

async function signUp(page: Page, email: string, opts: { academy?: string } = {}) {
  await page.goto("/signup");
  if (opts.academy) await page.getByRole("button", { name: /i run an academy/i }).click();
  await page.getByLabel("Full name").fill("E2E Cadet");
  if (opts.academy) await page.getByLabel("Academy name").fill(opts.academy);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
}

async function expectHealthyPage(page: Page) {
  await expect(page.getByText(/couldn.t load|something went wrong|application error/i)).toHaveCount(0);
}

test.describe("auth flows on a local Supabase stack", () => {
  test("student: signup → onboarding, role boundary, logout/login", async ({ page, browser }) => {
    const email = uniqueEmail("student");
    await signUp(page, email);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expectHealthyPage(page);

    await page.goto("/academy");
    await expect(page).toHaveURL(/\/forbidden$/);

    const fresh = await browser.newPage();
    await logIn(fresh, email, PASSWORD);
    await expect(fresh).toHaveURL(/\/student$/);
    await expectHealthyPage(fresh);

    // A next= from another role's workspace never lands on /forbidden.
    const other = await browser.newPage();
    await other.goto("/login?next=%2Fmentor");
    await other.getByLabel("Email").fill(email);
    await other.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await other.getByRole("button", { name: /^log in$/i }).click();
    await expect(other).toHaveURL(/\/student$/);
  });

  test("wrong password shows a clear error", async ({ page }) => {
    const email = uniqueEmail("wrongpw");
    await signUp(page, email);
    await expect(page).toHaveURL(/\/onboarding$/);
    const fresh = await page.context().browser()!.newPage();
    await logIn(fresh, email, "not-the-password");
    await expect(fresh.getByText("Incorrect email or password.")).toBeVisible();
  });

  test("academy admin: signup → academy dashboard", async ({ page }) => {
    await signUp(page, uniqueEmail("admin"), { academy: "E2E Academy" });
    await expect(page).toHaveURL(/\/academy$/);
    await expectHealthyPage(page);
    for (const path of ["/academy/students", "/academy/batches", "/academy/mentors"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expectHealthyPage(page);
    }
  });

  test("password reset: email link → new password → login; the link can't be reused", async ({ browser }) => {
    const email = uniqueEmail("reset");
    const signupPage = await browser.newPage();
    await signUp(signupPage, email);
    await expect(signupPage).toHaveURL(/\/onboarding$/);
    await signupPage.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/check your email/i)).toBeVisible();
    // Local stack: the page must say the email was captured, not delivered.
    await expect(page.getByText(/not sent to a real inbox/i)).toBeVisible();

    const link = await emailLink(email);
    // "commit": the callback redirects twice; waiting for "load" on the first
    // URL can abort while the dev server compiles the next route.
    await page.goto(link, { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/reset-password$/, { timeout: 20_000 });
    await page.getByLabel("New password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /save new password/i }).click();
    await expect(page).toHaveURL(/\/login\?reason=password_updated$/);

    await logIn(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/student$/, { timeout: 20_000 });

    const again = await (await browser.newContext()).newPage();
    await again.goto(link, { waitUntil: "commit" });
    await expect(again).toHaveURL(/\/forgot-password\?reason=link_invalid(#.*)?$/);
    await expect(again.getByText(/invalid, expired or already used/i)).toBeVisible();
  });

  test("mentor invite: academy admin invites → email → set password → mentor dashboard; bad or reused links fail", async ({ browser }) => {
    test.setTimeout(90_000); // six routes, each compiled on first use by `next dev`
    const admin = await (await browser.newContext()).newPage();
    await signUp(admin, uniqueEmail("inviter"), { academy: `E2E Invite Academy ${Date.now()}` });
    await expect(admin).toHaveURL(/\/academy$/, { timeout: 20_000 });

    const mentorEmail = uniqueEmail("mentor");
    await admin.goto("/academy/mentors");
    await admin.getByLabel("Full name").fill("E2E Mentor");
    await admin.getByLabel("Email").fill(mentorEmail);
    await admin.getByRole("button", { name: /send invite/i }).click();
    await expect(admin.getByRole("status")).toContainText(/invite sent/i);
    await expect(admin.getByText(/not sent to a real inbox/i)).toBeVisible();

    // Inviting the same person again before they accept re-sends it (no duplicate account).
    await admin.getByLabel("Full name").fill("E2E Mentor");
    await admin.getByLabel("Email").fill(mentorEmail);
    await admin.getByRole("button", { name: /send invite/i }).click();
    await expect(admin.getByRole("status").filter({ hasText: /re-sent/i })).toBeVisible({ timeout: 15_000 });

    // Captured by the local Mailpit inbox — proof an email was generated and
    // handed to SMTP, not just that the API said "ok".
    const link = await emailLink(mentorEmail);
    expect(new URL(link).searchParams.get("type")).toBe("invite");

    // A tampered token is refused before anything else.
    const tampered = new URL(link);
    tampered.searchParams.set("token", "0".repeat(56));
    const forged = await (await browser.newContext()).newPage();
    await forged.goto(tampered.toString(), { waitUntil: "commit" });
    await expect(forged.getByText(/this link has expired or was already used/i)).toBeVisible();

    // Invite link → signed in → choose a password (tokens never stay in the URL).
    const mentor = await (await browser.newContext()).newPage();
    await mentor.goto(link, { waitUntil: "commit" });
    await expect(mentor).toHaveURL(/\/reset-password$/, { timeout: 20_000 });
    await mentor.getByLabel("New password").fill(NEW_PASSWORD);
    await mentor.getByRole("button", { name: /save new password/i }).click();
    await expect(mentor).toHaveURL(/\/login\?reason=password_updated$/);
    await logIn(mentor, mentorEmail, NEW_PASSWORD);
    await expect(mentor).toHaveURL(/\/mentor$/, { timeout: 20_000 });
    await expectHealthyPage(mentor);

    // The admin now sees them as a mentor of this academy.
    await admin.goto("/academy/mentors");
    await expect(admin.getByText(mentorEmail)).toBeVisible();

    // The same link a second time fails safely.
    const again = await (await browser.newContext()).newPage();
    await again.goto(link, { waitUntil: "commit" });
    await expect(again.getByText(/this link has expired or was already used/i)).toBeVisible();

    // Inviting them now (an active mentor of this academy) is refused with a clear message.
    await admin.getByLabel("Full name").fill("E2E Mentor");
    await admin.getByLabel("Email").fill(mentorEmail);
    await admin.getByRole("button", { name: /send invite/i }).click();
    await expect(admin.getByRole("alert").filter({ hasText: /already a mentor in your academy/i })).toBeVisible({ timeout: 15_000 });
  });

  test("independent mentor: super admin invites (no academy) → set password → mentor workspace, academy-only areas empty", async ({ browser }) => {
    test.setTimeout(120_000);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    test.skip(!supabaseUrl || !serviceKey || !/^http:\/\/(127\.0\.0\.1|localhost):/.test(supabaseUrl), "needs the LOCAL stack's URL + service key in the environment");

    // A local super admin, created the way the service role / dev preview does.
    const superEmail = uniqueEmail("super");
    const created = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: superEmail, password: PASSWORD, email_confirm: true, app_metadata: { role: "super_admin" }, user_metadata: { full_name: "E2E Super" } }),
    });
    expect(created.ok).toBe(true);

    const admin = await (await browser.newContext()).newPage();
    await logIn(admin, superEmail, PASSWORD);
    await expect(admin).toHaveURL(/\/admin$/, { timeout: 20_000 });
    const mentorEmail = uniqueEmail("indie");
    await admin.goto("/admin/users");
    await admin.getByRole("textbox", { name: "Full name", exact: true }).fill("E2E Indie Mentor");
    await admin.getByRole("textbox", { name: "Email", exact: true }).fill(mentorEmail);
    await admin.getByRole("button", { name: /send invite/i }).click();
    await expect(admin.getByRole("status").filter({ hasText: /invite sent/i })).toBeVisible({ timeout: 15_000 });

    const link = await emailLink(mentorEmail);
    const mentor = await (await browser.newContext()).newPage();
    await mentor.goto(link, { waitUntil: "commit" });
    await expect(mentor).toHaveURL(/\/reset-password$/, { timeout: 20_000 });
    await mentor.getByLabel("New password").fill(NEW_PASSWORD);
    await mentor.getByRole("button", { name: /save new password/i }).click();
    await expect(mentor).toHaveURL(/\/login\?reason=password_updated$/, { timeout: 15_000 });
    await logIn(mentor, mentorEmail, NEW_PASSWORD);
    await expect(mentor).toHaveURL(/\/mentor$/, { timeout: 20_000 });
    await expect(mentor.getByText(/independent mentor/i)).toBeVisible();

    // Every mentor area renders (academy-only ones are simply empty).
    for (const path of ["/mentor/mentees", "/mentor/sessions", "/mentor/sessions/new", "/mentor/evaluations", "/mentor/assessments", "/mentor/content", "/mentor/library", "/mentor/profile", "/mentor/notifications"]) {
      await mentor.goto(path);
      await expect(mentor).toHaveURL(new RegExp(`${path}$`));
      await expectHealthyPage(mentor);
    }
    // ...and no academy workspace.
    await mentor.goto("/academy");
    await expect(mentor).toHaveURL(/\/forbidden$/);
  });

  test("dev preview signs into every role's own dashboard", async ({ browser }) => {
    test.skip(!process.env.E2E_DEV_PREVIEW, "needs `npm run dev:local` (dev preview on)");
    const dashboards: Record<string, string> = { student: "/student", mentor: "/mentor", academy_admin: "/academy", super_admin: "/admin" };
    for (const [role, path] of Object.entries(dashboards)) {
      const page = await (await browser.newContext()).newPage();
      await page.goto(`/dev-preview/${role}`);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expectHealthyPage(page);
    }
  });
});
