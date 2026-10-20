import { test, expect, type Page, type Browser } from "@playwright/test";

// End-to-end proof that EVERY cross-role communication path works with REAL,
// separate logged-in accounts (academy admin + 3 students + a mentor) and
// REAL UI actions — never seeded DB rows. Each cross-role action is verified
// by asserting on the RECEIVING user's own UI.
//
// Local-only: it signs up accounts, invites a mentor and reads the invite
// email from the LOCAL Mailpit inbox, so it must never run against a real
// project. Opt-in with E2E_MAILPIT_URL (e.g. http://127.0.0.1:54324).
const MAILPIT = process.env.E2E_MAILPIT_URL;
test.skip(!MAILPIT, "needs the local Supabase stack — set E2E_MAILPIT_URL");

const PASSWORD = "first-password-123";
const MENTOR_PASSWORD = "mentor-password-456";
const RUN = `${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;

function uniqueEmail(prefix: string) {
  return `${prefix}.${RUN}@example.test`;
}

// Reused from auth-flows-local.spec.ts: find the single invite/verify link
// Supabase emailed to `to` via the local Mailpit inbox.
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

async function signUpStudent(page: Page, email: string, fullName: string) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

async function signUpAcademy(page: Page, email: string, academy: string) {
  await page.goto("/signup");
  await page.getByRole("button", { name: /i run an academy/i }).click();
  await page.getByLabel("Full name").fill("E2E Admin");
  await page.getByLabel("Academy name").fill(academy);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/academy$/);
}

async function logIn(page: Page, email: string, password: string, expectUrl: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).toHaveURL(expectUrl);
}

// A fresh browser context == a fresh isolated session (own cookies).
async function freshPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

test.describe("cross-role communication with real logins", () => {
  // One long serial scenario: the whole point is that state created by one
  // real user is received by another real user.
  test("institute ↔ mentor ↔ students: all 6 paths", async ({ browser }) => {
    test.setTimeout(15 * 60_000);

    // Collected PASS/FAIL evidence for each path, printed at the end.
    const results: string[] = [];

    const academyName = `E2E Academy ${RUN}`;
    const adminEmail = uniqueEmail("admin");
    const mentorEmail = uniqueEmail("mentor");
    const mentorName = "E2E Mentor";
    const students = [1, 2, 3].map((n) => ({ email: uniqueEmail(`student${n}`), name: `E2E Student ${n}` }));

    const batchName = `Batch ${RUN}`;
    const sessionTitle = `Session ${RUN}`;
    const assessmentTitle = `Assessment ${RUN}`;
    const question = "Describe a time you showed initiative.";
    const answerFor = (name: string) => `This is ${name}'s real submitted answer for ${RUN}.`;

    // ----- Set up the real accounts (fresh contexts = isolated sessions) -----
    const adminPage = await freshPage(browser);
    await signUpAcademy(adminPage, adminEmail, academyName);

    // Students self-sign up first (no academy yet), so the admin can attach
    // them by email — the real "existing account joins academy" path.
    const studentPages: Page[] = [];
    for (const s of students) {
      const sp = await freshPage(browser);
      await signUpStudent(sp, s.email, s.name);
      studentPages.push(sp);
    }

    // =====================================================================
    // PATH 1 (part A) — INSTITUTE -> MENTOR: academy invites a mentor.
    // =====================================================================
    await adminPage.goto("/academy/mentors");
    await adminPage.getByLabel("Full name").fill(mentorName);
    await adminPage.getByLabel("Email").fill(mentorEmail);
    await adminPage.getByRole("button", { name: /send invite/i }).click();
    await expect(adminPage.getByText(/invite sent to/i)).toBeVisible({ timeout: 15_000 });

    // Mentor accepts the real invite email and sets a password (we log in with
    // a fresh context later, AFTER the batch assignment).
    // The invite verify link lands on /reset-password with the session tokens
    // in the URL hash. The browser Supabase client's own detectSessionInUrl
    // races with the page's manual hash handling and can show a transient
    // "link expired" state while still storing the session — a reload (which a
    // real user would do) re-reads the stored session and renders the form.
    const mentorSetupPage = await freshPage(browser);
    const inviteLink = await emailLink(mentorEmail);
    await mentorSetupPage.goto(inviteLink);
    await expect(mentorSetupPage).toHaveURL(/\/reset-password$/, { timeout: 15_000 });
    const newPassword = mentorSetupPage.getByLabel("New password");
    for (let attempt = 0; attempt < 5 && (await newPassword.count()) === 0; attempt++) {
      await mentorSetupPage.goto("/reset-password", { waitUntil: "domcontentloaded" });
      await mentorSetupPage.waitForTimeout(1500);
    }
    await expect(newPassword).toBeVisible({ timeout: 15_000 });
    await newPassword.fill(MENTOR_PASSWORD);
    await mentorSetupPage.getByRole("button", { name: /save new password/i }).click();
    await expect(mentorSetupPage).toHaveURL(/\/login\?reason=password_updated$/, { timeout: 15_000 });
    results.push("PATH 1 (invite) PASS: academy invited mentor; mentor accepted invite email and set a password.");

    // =====================================================================
    // PATH 2 — INSTITUTE -> STUDENT: admin adds all 3 students by email.
    // =====================================================================
    for (const s of students) {
      await adminPage.goto("/academy/students");
      await adminPage.getByRole("button", { name: /add student/i }).first().click();
      const dialog = adminPage.getByRole("dialog");
      await dialog.locator("#student-email").fill(s.email);
      await dialog.getByRole("button", { name: /^add student$/i }).click();
      await expect(adminPage.getByText(new RegExp(`${s.name}.*joined your academy`, "i"))).toBeVisible({ timeout: 15_000 });
    }

    // Admin creates a batch.
    await adminPage.goto("/academy/batches");
    await adminPage.getByRole("button", { name: /create batch/i }).first().click();
    const batchDialog = adminPage.getByRole("dialog");
    await batchDialog.getByLabel("Batch name").fill(batchName);
    await batchDialog.getByRole("button", { name: /^create batch$/i }).click();
    await expect(adminPage.getByText(new RegExp(`${batchName} was created`, "i"))).toBeVisible({ timeout: 15_000 });

    // Open the batch and add mentor + all students (real server actions).
    await adminPage.goto("/academy/batches");
    await adminPage.getByRole("link", { name: batchName }).click();
    await expect(adminPage).toHaveURL(/\/academy\/batches\/[0-9a-f-]+$/, { timeout: 20_000 });
    await expect(adminPage.getByRole("heading", { name: batchName })).toBeVisible({ timeout: 20_000 });

    // PATH 1 (part B) — assign the mentor to the batch.
    await adminPage.getByLabel("Assign a mentor").click();
    await adminPage.getByRole("option", { name: new RegExp(mentorName, "i") }).click();
    await adminPage.getByRole("button", { name: /assign mentor/i }).click();
    await expect(adminPage.getByText(mentorName).first()).toBeVisible({ timeout: 15_000 });

    // Add each student to the batch (the picker shows only unassigned ones).
    for (const s of students) {
      await adminPage.getByLabel("Add a student").click();
      await adminPage.getByRole("option", { name: new RegExp(s.name, "i") }).click();
      await adminPage.getByRole("button", { name: /add student/i }).click();
      await expect(adminPage.getByText(s.email).first()).toBeVisible({ timeout: 15_000 });
    }

    // VERIFY PATH 2 (institute -> student): each student, logged in fresh,
    // receives the "added to a batch" notification naming the batch (real
    // trigger notify_batch_member -> /student/notifications).
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      await logIn(studentPages[i], s.email, PASSWORD, /\/student$/);
      await studentPages[i].goto("/student/notifications");
      await expect(studentPages[i].getByText(/you've been added to a batch/i).first()).toBeVisible({ timeout: 15_000 });
      await expect(studentPages[i].getByText(new RegExp(batchName, "i")).first()).toBeVisible({ timeout: 15_000 });
    }
    results.push(`PATH 2 (institute -> student) PASS: all ${students.length} students logged in and saw the "added to a batch" notification naming the batch.`);

    // VERIFY PATH 1 (institute -> mentor): mentor, logged in, sees the batch
    // (subtitle) and all 3 of its students on their Mentees workspace, and
    // got the "you're mentoring a batch" notification.
    // Re-login the mentor in a FRESH context AFTER the batch assignment so no
    // stale (pre-assignment) session cache hides the new batch.
    const mentorPage = await freshPage(browser);
    await logIn(mentorPage, mentorEmail, MENTOR_PASSWORD, /\/mentor$/);
    await mentorPage.goto("/mentor/mentees");
    await expect(mentorPage.getByText(new RegExp(batchName, "i")).first()).toBeVisible({ timeout: 15_000 });
    for (const s of students) {
      await expect(mentorPage.getByText(s.name).first()).toBeVisible({ timeout: 15_000 });
    }
    await mentorPage.goto("/mentor/notifications");
    await expect(mentorPage.getByText(/you're mentoring a batch/i).first()).toBeVisible({ timeout: 15_000 });
    results.push("PATH 1 (institute -> mentor) PASS: mentor logged in, saw the batch + all 3 students on /mentor/mentees and the 'mentoring a batch' notification.");

    // =====================================================================
    // PATH 3 — MENTOR -> STUDENTS: schedule a session + publish an assessment.
    // =====================================================================
    // Schedule a session for the whole batch. This step exercises a known
    // server bug (see report): the sessions INSERT ... RETURNING is rejected
    // by the sessions SELECT RLS policy `can_see_session(id)`, which re-queries
    // the sessions table for the not-yet-visible new row. We record the result
    // rather than aborting, so every other path is still verified.
    let sessionScheduled = false;
    const tomorrow = new Date(Date.now() + 24 * 3600_000);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    await mentorPage.goto("/mentor/sessions/new");
    await expect(mentorPage.getByLabel("Title")).toBeVisible({ timeout: 15_000 });
    await mentorPage.getByLabel("Title").fill(sessionTitle);
    await mentorPage.getByLabel("Date").fill(dateStr);
    await mentorPage.getByLabel("Starts").fill("10:00");
    await mentorPage.getByLabel("Ends").fill("11:00");
    await mentorPage.getByLabel("Meeting link").fill("https://meet.example.test/e2e");
    await mentorPage.getByRole("button", { name: /schedule session/i }).click();
    try {
      await expect(mentorPage).toHaveURL(/\/mentor\/sessions\/[0-9a-f-]+/, { timeout: 12_000 });
      sessionScheduled = true;
    } catch {
      const alerts = await mentorPage.getByRole("alert").allInnerTexts();
      results.push(`PATH 3 (session) FAIL: scheduleSessionAction rejected — alert="${alerts.join(" | ").trim()}". Root cause: sessions INSERT...RETURNING blocked by sessions_read RLS (can_see_session) in supabase/migrations/0010_sessions.sql.`);
    }

    // Create an assessment (draft) then open it for answers (publish).
    await mentorPage.goto("/mentor/assessments/new");
    await mentorPage.getByLabel("Title").fill(assessmentTitle);
    await mentorPage.getByLabel("Question 1").fill(question);
    await mentorPage.getByLabel("Maximum score").fill("10");
    await mentorPage.getByRole("button", { name: /save as draft/i }).click();
    await expect(mentorPage).toHaveURL(/\/mentor\/assessments\/[0-9a-f-]+/, { timeout: 20_000 });
    const assessmentUrl = mentorPage.url();
    await mentorPage.getByRole("button", { name: /open for answers/i }).click();
    // Confirm dialog -> second "Open for answers" button.
    await mentorPage.getByRole("button", { name: /open for answers/i }).last().click();
    // Published assessments render status label "Open" and expose a "Close" action.
    await expect(mentorPage.getByRole("button", { name: /^close$/i }).first()).toBeVisible({ timeout: 15_000 });
    results.push("PATH 3 (assessment) PASS: assessment created + published (status 'Open') by mentor.");

    // VERIFY PATH 3: each student sees the published assessment (and, when the
    // session was scheduled, the session too).
    for (let i = 0; i < students.length; i++) {
      const sp = studentPages[i];
      if (sessionScheduled) {
        await sp.goto("/student/sessions");
        await expect(sp.getByText(new RegExp(sessionTitle, "i")).first()).toBeVisible({ timeout: 15_000 });
      }
      await sp.goto("/student/assessments");
      await expect(sp.getByText(new RegExp(assessmentTitle, "i")).first()).toBeVisible({ timeout: 15_000 });
    }
    if (sessionScheduled) results.push("PATH 3 (session) PASS: all students saw the session.");
    results.push("PATH 3 (assessment delivery) PASS: all students saw the published assessment.");

    // =====================================================================
    // PATH 4 — STUDENT -> MENTOR: each student opens and SUBMITS the assessment.
    // =====================================================================
    for (let i = 0; i < students.length; i++) {
      const sp = studentPages[i];
      await sp.goto("/student/assessments");
      await sp.getByText(new RegExp(assessmentTitle, "i")).first().click();
      await expect(sp).toHaveURL(/\/student\/assessments\/[0-9a-f-]+/, { timeout: 15_000 });
      // Answer the single question (textarea id = ans-<questionId>).
      await sp.locator("textarea[id^='ans-']").first().fill(answerFor(students[i].name));
      await sp.getByRole("button", { name: /^submit$/i }).click();
      // Confirm in the dialog.
      await sp.getByRole("button", { name: /^submit$/i }).last().click();
      await expect(sp.getByText(/submitted\. your mentor will review it|submitted\./i).first()).toBeVisible({ timeout: 15_000 });
    }

    // VERIFY PATH 4: mentor sees ALL 3 submissions in the review queue.
    await mentorPage.goto("/mentor/evaluations");
    for (const s of students) {
      await expect(mentorPage.getByText(new RegExp(`${s.name}.*${assessmentTitle}|${s.name}`, "i")).first()).toBeVisible({ timeout: 15_000 });
    }
    results.push(`PATH 4 (student -> mentor) PASS: all ${students.length} student submissions appeared in the mentor's /mentor/evaluations queue.`);

    // =====================================================================
    // PATH 5 — MENTOR -> STUDENT (feedback): review student 1's attempt.
    // =====================================================================
    await mentorPage.goto("/mentor/evaluations");
    await mentorPage.getByText(new RegExp(students[0].name, "i")).first().click();
    await expect(mentorPage).toHaveURL(/\/mentor\/evaluations\/[0-9a-f-]+/, { timeout: 15_000 });
    const feedbackScore = "8";
    const feedbackStrength = `Clear reasoning (${RUN}).`;
    await mentorPage.getByLabel(/Score \(out of/i).fill(feedbackScore);
    await mentorPage.getByLabel("Strengths").fill(feedbackStrength);
    await mentorPage.getByLabel("Areas to improve").fill("Add more detail.");
    await mentorPage.getByRole("button", { name: /submit review/i }).click();
    await mentorPage.getByRole("button", { name: /submit review/i }).last().click();
    // After submit, the form is replaced by the read-only reviewed feedback.
    await expect(mentorPage.getByRole("heading", { name: /mentor feedback/i })).toBeVisible({ timeout: 15_000 });

    // VERIFY PATH 5: student 1 sees the score + feedback on their attempt.
    const s1 = studentPages[0];
    await s1.goto("/student/assessments");
    await s1.getByText(new RegExp(assessmentTitle, "i")).first().click();
    await expect(s1.getByText("Mentor feedback").first()).toBeVisible({ timeout: 15_000 });
    await expect(s1.getByText(feedbackScore).first()).toBeVisible();
    await expect(s1.getByText(feedbackStrength).first()).toBeVisible();
    results.push(`PATH 5 (mentor -> student feedback) PASS: mentor submitted a score (${feedbackScore}) + feedback; student saw "Mentor feedback", the score and the strengths text on their attempt.`);

    // =====================================================================
    // PATH 6 — INSTITUTE visibility: admin sees everything in its workspace.
    // =====================================================================
    await adminPage.goto("/academy/mentors");
    await expect(adminPage.getByText(mentorName).first()).toBeVisible({ timeout: 15_000 });

    await adminPage.goto("/academy/students");
    for (const s of students) {
      await expect(adminPage.getByText(s.name).first()).toBeVisible({ timeout: 15_000 });
    }

    await adminPage.goto("/academy/batches");
    await expect(adminPage.getByText(new RegExp(batchName, "i")).first()).toBeVisible({ timeout: 15_000 });

    if (sessionScheduled) {
      await adminPage.goto("/academy/sessions");
      await expect(adminPage.getByText(new RegExp(sessionTitle, "i")).first()).toBeVisible({ timeout: 15_000 });
    }

    await adminPage.goto("/academy/assessments");
    await expect(adminPage.getByText(new RegExp(assessmentTitle, "i")).first()).toBeVisible({ timeout: 15_000 });
    results.push(`PATH 6 (institute visibility) PASS: admin saw mentor, all students, the batch${sessionScheduled ? ", the session" : " (session N/A — see PATH 3)"} and the assessment in the academy workspace.`);

    // Keep assessmentUrl referenced (used above); avoids unused-var lint.
    expect(assessmentUrl).toContain("/mentor/assessments/");

    // ----- Final PASS/FAIL matrix -----
    console.log("\n===== CROSS-ROLE COMMUNICATION MATRIX =====");
    for (const line of results) console.log(" • " + line);
    console.log("===========================================\n");

    // The suite is green only if nothing recorded a FAIL. A genuinely broken
    // path (e.g. session scheduling) surfaces here with its evidence.
    const failures = results.filter((r) => r.includes("FAIL"));
    expect(failures, `broken communication paths:\n${failures.join("\n")}`).toEqual([]);
  });
});
