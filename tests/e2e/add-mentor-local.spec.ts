import { test, expect, type Page } from "@playwright/test";

// Add Mentor (manual + invite) against the LOCAL Supabase stack: real Auth,
// real triggers and RLS, emails read from the local Mailpit inbox. Opt-in via
// E2E_MAILPIT_URL (e.g. http://127.0.0.1:54324); never run against a real
// project. Needs supabase/migrations/0027 applied to the local database and
// the server started with the local SUPABASE_SERVICE_ROLE_KEY.
const MAILPIT = process.env.E2E_MAILPIT_URL;
test.skip(!MAILPIT, "needs the local Supabase stack — set E2E_MAILPIT_URL");

const PASSWORD = "admin-password-123";
const MENTOR_PASSWORD = "mentor-password-456";

const uniqueEmail = (prefix: string) => `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.test`;

async function inviteLink(to: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages } = (await search.json()) as { messages?: { ID: string }[] };
    if (messages?.length) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { HTML?: string; Text?: string };
      const href = (message.HTML ?? "").match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1] ?? (message.Text ?? "").match(/(http\S*\/auth\/v1\/verify\S*)/)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no invite email arrived for ${to}`);
}

async function mailCount(to: string): Promise<number> {
  const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
  return ((await search.json()) as { messages?: unknown[] }).messages?.length ?? 0;
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
}

async function academyAdmin(page: Page) {
  await page.goto("/signup");
  await page.getByRole("button", { name: /i run an academy/i }).click();
  await page.getByLabel("Full name", { exact: true }).fill("E2E Admin");
  await page.getByLabel("Academy name").fill(`Mentor Test Academy ${Date.now()}`);
  await page.getByLabel("Email").fill(uniqueEmail("admin"));
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/academy$/, { timeout: 30_000 });
  await page.goto("/academy/mentors");
}

// ListRow (components/ui/list-panel) is a styled div, one per mentor.
const row = (page: Page, email: string) => page.locator(".row-hover-tint").filter({ hasText: email });

test.describe("Add Mentor on a local Supabase stack", () => {
  test.setTimeout(180_000);

  test("manual profile → no login → invite → accept → mentor logs in → shown as active", async ({ page, browser }) => {
    await academyAdmin(page);
    const email = uniqueEmail("manual.mentor");

    await page.getByRole("tab", { name: "Add manually" }).click();
    await page.getByLabel("Full name", { exact: true }).fill("Major Rao");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel(/^Phone/).fill("+91 98765 43210");
    await page.getByLabel(/^Specialization/).fill("GTO, Interview");
    await page.getByLabel(/^Qualifications/).fill("Ex-GTO assessor");
    await page.getByRole("button", { name: "Add mentor" }).click();
    await expect(page.getByRole("status").filter({ hasText: /was added/ })).toContainText(/Major Rao was added. They can't log in yet/);
    await expect(row(page, email)).toContainText("Added — not invited (can't log in)");
    await expect(row(page, email)).toContainText("GTO · Interview"); // details saved and readable under RLS (0027)
    expect(await mailCount(email)).toBe(0); // manual creation sends nothing

    // The same email again is refused (no duplicate profile).
    await page.getByLabel("Full name", { exact: true }).fill("Major Rao");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Add mentor" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /already one of your mentors/ })).toBeVisible();

    // No password exists, so nobody can log in as the mentor yet.
    const outsider = await browser.newPage();
    await logIn(outsider, email, "any-guess-123");
    await expect(outsider.getByText(/incorrect email or password/i)).toBeVisible();

    // Invite from the list → Mailpit receives it → status pending.
    await row(page, email).getByRole("button", { name: "Send invite to Major Rao" }).click();
    await expect(row(page, email)).toContainText(/Invite sent to Major Rao/);
    await page.reload();
    await expect(row(page, email)).toContainText("Invite pending");

    // The mentor accepts from the email and chooses their own password.
    const mentor = await browser.newPage();
    await mentor.goto(await inviteLink(email));
    await expect(mentor.getByRole("heading", { name: "Set a new password" })).toBeVisible({ timeout: 30_000 });
    await mentor.getByLabel("New password").fill(MENTOR_PASSWORD);
    await mentor.getByRole("button", { name: /save new password/i }).click();
    await expect(mentor).toHaveURL(/\/login\?reason=password_updated/);
    await logIn(mentor, email, MENTOR_PASSWORD);
    await expect(mentor).toHaveURL(/\/mentor$/, { timeout: 30_000 });

    // Accepted: active, and no invite actions any more.
    await page.reload();
    await expect(row(page, email)).toContainText("Active");
    await expect(row(page, email).getByRole("button", { name: /invite|revoke|remove/i })).toHaveCount(0);
  });

  test("invite by email → revoke → the link stops working and the mentor is gone", async ({ page, browser }) => {
    await academyAdmin(page);
    const email = uniqueEmail("invited.mentor");

    await page.getByLabel("Full name", { exact: true }).fill("Captain Iyer");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Invite sent/ })).toContainText(/Invite sent to Captain Iyer/);
    await expect(row(page, email)).toContainText("Invite pending");
    const link = await inviteLink(email);

    await row(page, email).getByRole("button", { name: "Revoke the invite for Captain Iyer" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Revoke invite" }).click();
    await expect(row(page, email)).toHaveCount(0);

    const mentor = await browser.newPage();
    await mentor.goto(link);
    await expect(mentor.getByRole("heading", { name: "Set a new password" })).toHaveCount(0);
    await expect(mentor.getByText(/expired or was already used|invalid or has expired|invalid, expired or already used/i)).toBeVisible({ timeout: 30_000 });
  });
});
