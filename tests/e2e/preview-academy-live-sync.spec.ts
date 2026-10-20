import { test, expect, type Page, type Browser } from "@playwright/test";

// OPTION B — live cross-dashboard sync against the EXISTING "Preview Academy".
//
// Setup done out-of-band: the Preview Academy mentor was deleted, leaving the
// real admin (preview.academy@ssbacademy.dev), 5 students (preview.student +
// seed.student1..4) and "Alpha Batch". This test:
//   1. logs in the REAL admin + REAL student via /dev-preview (genuine sessions),
//   2. invites a FRESH mentor through the real academy UI + accepts the email,
//   3. assigns that mentor to Alpha Batch,
//   4. opens all three dashboards and verifies every communication type is in
//      sync, asserting on the RECEIVING user's own live UI.
//
// Local-only: reads the invite email from the local Mailpit inbox.
const MAILPIT = process.env.E2E_MAILPIT_URL;
test.skip(!MAILPIT, "needs the local Supabase stack — set E2E_MAILPIT_URL");

const MENTOR_PASSWORD = "mentor-password-456";
const BATCH_NAME = "Alpha Batch";
const PREVIEW_STUDENT_NAME = "Preview Student";
const RUN = `${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;

async function emailLink(to: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages } = (await search.json()) as { messages?: { ID: string }[] };
    if (messages?.length) {
      const message = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { HTML?: string; Text?: string };
      const href =
        (message.HTML ?? "").match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/)?.[1] ??
        (message.Text ?? "").match(/(http\S*\/auth\/v1\/verify\S*)/)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no invite email with a verify link arrived for ${to}`);
}

async function logIn(page: Page, email: string, password: string, expectUrl: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).toHaveURL(expectUrl);
}

async function freshPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

test.describe("Option B — Preview Academy live sync", () => {
  test("admin ↔ fresh mentor ↔ student: all communication in sync", async ({ browser }) => {
    test.setTimeout(12 * 60_000);
    const results: string[] = [];

    const mentorEmail = `preview.mentor+${RUN}@ssbacademy.dev`;
    const mentorName = `Preview Mentor ${RUN}`;
    const sessionTitle = `GD Session ${RUN}`;
    const assessmentTitle = `SRT ${RUN}`;
    const question = "You see a group arguing near your hostel. What do you do?";
    const studentAnswer = `Preview Student's real answer for ${RUN}.`;

    // ---- Real admin session (existing Preview Admin) via dev-preview ----
    const adminPage = await freshPage(browser);
    await adminPage.goto("/dev-preview/academy_admin");
    await expect(adminPage).toHaveURL(/\/academy$/, { timeout: 20_000 });
    results.push("SETUP PASS: logged in as the REAL Preview Admin (dev-preview, genuine session).");

    // ---- PATH 1a — admin invites a FRESH mentor by email ----
    await adminPage.goto("/academy/mentors");
    await adminPage.getByLabel("Full name").fill(mentorName);
    await adminPage.getByLabel("Email").fill(mentorEmail);
    await adminPage.getByRole("button", { name: /send invite/i }).click();
    await expect(adminPage.getByText(/invite sent to/i)).toBeVisible({ timeout: 15_000 });

    // Mentor accepts the real invite email, sets a password.
    const mentorSetup = await freshPage(browser);
    const inviteLink = await emailLink(mentorEmail);
    await mentorSetup.goto(inviteLink);
    await expect(mentorSetup).toHaveURL(/\/reset-password$/, { timeout: 15_000 });
    const newPassword = mentorSetup.getByLabel("New password");
    for (let attempt = 0; attempt < 5 && (await newPassword.count()) === 0; attempt++) {
      await mentorSetup.goto("/reset-password", { waitUntil: "domcontentloaded" });
      await mentorSetup.waitForTimeout(1500);
    }
    await expect(newPassword).toBeVisible({ timeout: 15_000 });
    await newPassword.fill(MENTOR_PASSWORD);
    await mentorSetup.getByRole("button", { name: /save new password/i }).click();
    await expect(mentorSetup).toHaveURL(/\/login\?reason=password_updated$/, { timeout: 15_000 });
    results.push("PATH 1 (invite) PASS: admin invited a fresh mentor; mentor accepted the email and set a password.");

    // ---- PATH 1b — admin assigns the mentor to Alpha Batch ----
    await adminPage.goto("/academy/batches");
    await adminPage.getByRole("link", { name: BATCH_NAME }).click();
    await expect(adminPage).toHaveURL(/\/academy\/batches\/[0-9a-f-]+$/, { timeout: 20_000 });
    await expect(adminPage.getByRole("heading", { name: BATCH_NAME })).toBeVisible({ timeout: 20_000 });
    await adminPage.getByLabel("Assign a mentor").click();
    await adminPage.getByRole("option", { name: new RegExp(mentorName, "i") }).click();
    await adminPage.getByRole("button", { name: /assign mentor/i }).click();
    await expect(adminPage.getByText(mentorName).first()).toBeVisible({ timeout: 15_000 });
    results.push("PATH 6a (admin -> batch) PASS: admin assigned the new mentor to Alpha Batch (visible in the batch view).");

    // ---- Mentor logs in fresh AFTER assignment; sees batch + students ----
    const mentorPage = await freshPage(browser);
    await logIn(mentorPage, mentorEmail, MENTOR_PASSWORD, /\/mentor$/);
    await mentorPage.goto("/mentor/mentees");
    await expect(mentorPage.getByText(new RegExp(BATCH_NAME, "i")).first()).toBeVisible({ timeout: 15_000 });
    await expect(mentorPage.getByText(new RegExp(PREVIEW_STUDENT_NAME, "i")).first()).toBeVisible({ timeout: 15_000 });
    await mentorPage.goto("/mentor/notifications");
    await expect(mentorPage.getByText(/you're mentoring a batch/i).first()).toBeVisible({ timeout: 15_000 });
    results.push("PATH 1 (institute -> mentor) PASS: mentor logged in, saw Alpha Batch + its students on /mentor/mentees and the 'mentoring a batch' notification.");

    // ---- Real student session (existing Preview Student) via dev-preview ----
    const studentPage = await freshPage(browser);
    await studentPage.goto("/dev-preview/student");
    await expect(studentPage).toHaveURL(/\/student$/, { timeout: 20_000 });
    results.push("SETUP PASS: logged in as the REAL Preview Student (dev-preview, genuine session).");

    // ---- PATH 3 — mentor schedules a session + publishes an assessment ----
    let sessionScheduled = false;
    const tomorrow = new Date(Date.now() + 24 * 3600_000);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    await mentorPage.goto("/mentor/sessions/new");
    await expect(mentorPage.getByLabel("Title")).toBeVisible({ timeout: 15_000 });
    await mentorPage.getByLabel("Title").fill(sessionTitle);
    await mentorPage.getByLabel("Date").fill(dateStr);
    await mentorPage.getByLabel("Starts").fill("10:00");
    await mentorPage.getByLabel("Ends").fill("11:00");
    await mentorPage.getByLabel("Meeting link").fill("https://meet.example.test/preview-gd");
    await mentorPage.getByRole("button", { name: /schedule session/i }).click();
    try {
      await expect(mentorPage).toHaveURL(/\/mentor\/sessions\/[0-9a-f-]+/, { timeout: 12_000 });
      sessionScheduled = true;
    } catch {
      const alerts = await mentorPage.getByRole("alert").allInnerTexts();
      results.push(`PATH 3 (session) FAIL: scheduleSession rejected — alert="${alerts.join(" | ").trim()}".`);
    }

    await mentorPage.goto("/mentor/assessments/new");
    await mentorPage.getByLabel("Title").fill(assessmentTitle);
    await mentorPage.getByLabel("Question 1").fill(question);
    await mentorPage.getByLabel("Maximum score").fill("10");
    await mentorPage.getByRole("button", { name: /save as draft/i }).click();
    await expect(mentorPage).toHaveURL(/\/mentor\/assessments\/[0-9a-f-]+/, { timeout: 20_000 });
    await mentorPage.getByRole("button", { name: /open for answers/i }).click();
    await mentorPage.getByRole("button", { name: /open for answers/i }).last().click();
    await expect(mentorPage.getByRole("button", { name: /^close$/i }).first()).toBeVisible({ timeout: 15_000 });
    results.push("PATH 3 (assessment) PASS: mentor created + published (status 'Open') an assessment.");

    // ---- VERIFY PATH 3: student sees them live ----
    if (sessionScheduled) {
      await studentPage.goto("/student/sessions");
      await expect(studentPage.getByText(new RegExp(sessionTitle, "i")).first()).toBeVisible({ timeout: 15_000 });
      results.push("PATH 3 (session) PASS: the student saw the mentor's session live.");
    }
    await studentPage.goto("/student/assessments");
    await expect(studentPage.getByText(new RegExp(assessmentTitle, "i")).first()).toBeVisible({ timeout: 15_000 });
    results.push("PATH 3 (assessment delivery) PASS: the student saw the published assessment live.");

    // ---- PATH 4 — student submits; mentor sees it ----
    await studentPage.getByText(new RegExp(assessmentTitle, "i")).first().click();
    await expect(studentPage).toHaveURL(/\/student\/assessments\/[0-9a-f-]+/, { timeout: 15_000 });
    await studentPage.locator("textarea[id^='ans-']").first().fill(studentAnswer);
    await studentPage.getByRole("button", { name: /^submit$/i }).click();
    await studentPage.getByRole("button", { name: /^submit$/i }).last().click();
    await expect(studentPage.getByText(/submitted\./i).first()).toBeVisible({ timeout: 15_000 });

    await mentorPage.goto("/mentor/evaluations");
    await expect(mentorPage.getByText(new RegExp(PREVIEW_STUDENT_NAME, "i")).first()).toBeVisible({ timeout: 15_000 });
    results.push("PATH 4 (student -> mentor) PASS: the student's submission appeared live in the mentor's /mentor/evaluations queue.");

    // ---- PATH 5 — mentor gives feedback; student sees it ----
    await mentorPage.getByText(new RegExp(PREVIEW_STUDENT_NAME, "i")).first().click();
    await expect(mentorPage).toHaveURL(/\/mentor\/evaluations\/[0-9a-f-]+/, { timeout: 15_000 });
    const score = "8";
    const strength = `Clear reasoning (${RUN}).`;
    await mentorPage.getByLabel(/Score \(out of/i).fill(score);
    await mentorPage.getByLabel("Strengths").fill(strength);
    await mentorPage.getByLabel("Areas to improve").fill("Add more detail.");
    await mentorPage.getByRole("button", { name: /submit review/i }).click();
    await mentorPage.getByRole("button", { name: /submit review/i }).last().click();
    await expect(mentorPage.getByRole("heading", { name: /mentor feedback/i })).toBeVisible({ timeout: 15_000 });

    await studentPage.goto("/student/assessments");
    await studentPage.getByText(new RegExp(assessmentTitle, "i")).first().click();
    await expect(studentPage.getByText("Mentor feedback").first()).toBeVisible({ timeout: 15_000 });
    await expect(studentPage.getByText(score).first()).toBeVisible();
    await expect(studentPage.getByText(strength).first()).toBeVisible();
    results.push(`PATH 5 (mentor -> student feedback) PASS: mentor submitted score ${score} + feedback; student saw "Mentor feedback", the score and the strengths text live.`);

    // ---- PATH 6 — admin dashboard sees everything ----
    await adminPage.goto("/academy/mentors");
    await expect(adminPage.getByText(mentorName).first()).toBeVisible({ timeout: 15_000 });
    await adminPage.goto("/academy/assessments");
    await expect(adminPage.getByText(new RegExp(assessmentTitle, "i")).first()).toBeVisible({ timeout: 15_000 });
    if (sessionScheduled) {
      await adminPage.goto("/academy/sessions");
      await expect(adminPage.getByText(new RegExp(sessionTitle, "i")).first()).toBeVisible({ timeout: 15_000 });
    }
    results.push(`PATH 6 (institute visibility) PASS: admin dashboard shows the new mentor, the assessment${sessionScheduled ? " and the session" : ""} live.`);

    console.log("\n===== PREVIEW ACADEMY LIVE-SYNC MATRIX =====");
    for (const line of results) console.log(" • " + line);
    console.log("============================================\n");

    const failures = results.filter((r) => r.includes("FAIL"));
    expect(failures, `broken paths:\n${failures.join("\n")}`).toEqual([]);
  });
});
