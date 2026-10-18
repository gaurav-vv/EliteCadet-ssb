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

    const link = await emailLink(email);
    await page.goto(link);
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel("New password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: /save new password/i }).click();
    await expect(page).toHaveURL(/\/login\?reason=password_updated$/);

    await logIn(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/student$/);

    const again = await (await browser.newContext()).newPage();
    await again.goto(link);
    await expect(again).toHaveURL(/\/forgot-password\?reason=link_invalid(#.*)?$/);
    await expect(again.getByText(/invalid, expired or already used/i)).toBeVisible();
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
