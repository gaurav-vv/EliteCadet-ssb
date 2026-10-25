import { chromium, expect, test, type Browser, type Page } from "@playwright/test";

// A real two-browser LiveKit meeting against the LOCAL stack (T094):
// local Supabase + `npm run dev` + a local livekit-server (docs/live-meetings.md).
// Opt-in via E2E_LIVEKIT=1; needs the local stack's URL + service key in the
// environment (it creates throwaway @example.test accounts with the service
// role, like the SQL checks do). Chromium's fake camera/microphone provide
// the media, so audio/video really flow through the SFU.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost):/.test(SUPABASE_URL);
test.skip(!process.env.E2E_LIVEKIT || !SERVICE_KEY || !LOCAL, "needs E2E_LIVEKIT=1 and the LOCAL Supabase URL + service key");

const PASSWORD = "meeting-password-123";
const stamp = `${Date.now()}`;
const svc = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };

async function rest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { ...svc, Prefer: "return=representation", ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path.split("?")[0]} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function createUser(email: string, appMeta: Record<string, string>, fullName: string, extra: Record<string, string> = {}) {
  const user = await rest("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, app_metadata: appMeta, user_metadata: { full_name: fullName, ...extra } }),
  });
  return user.id as string;
}

async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /^log in$/i }).click();
}

// IST wall-clock pieces for the schedule form.
function istParts(ms: number) {
  const iso = new Date(ms + 330 * 60_000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

const hasLiveVideo = (page: Page) => page.waitForFunction(() => [...document.querySelectorAll("video")].some((v) => v.videoWidth > 0 && v.readyState >= 2), null, { timeout: 30_000 });
const remoteAudioTracks = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll("audio")].flatMap((a) => ((a.srcObject as MediaStream | null)?.getAudioTracks() ?? []).filter((t) => t.readyState === "live")).length);

test("mentor and students meet: media, chat, reactions, raised hands, leave vs end, 75% attendance", async () => {
  test.setTimeout(360_000);
  const browser: Browser = await chromium.launch({ args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
  const contextOpts = { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", permissions: ["camera", "microphone"] };

  // ---- Throwaway academy, batch, mentor and students (service role, local only) ----
  const adminId = await createUser(`meet.admin.${stamp}@example.test`, { role: "academy_admin" }, "Meet Admin", { academy_name: `Meet Academy ${stamp}` });
  const [{ academy_id: academyId }] = await rest(`/rest/v1/profiles?id=eq.${adminId}&select=academy_id`);
  const mentorEmail = `meet.mentor.${stamp}@example.test`;
  const studentEmail = `meet.student.${stamp}@example.test`;
  const outsiderEmail = `meet.outsider.${stamp}@example.test`;
  const mentorId = await createUser(mentorEmail, { role: "mentor", academy_id: academyId }, "Meet Mentor");
  const studentId = await createUser(studentEmail, { role: "student", academy_id: academyId }, "Meet Student");
  await createUser(outsiderEmail, { role: "student", academy_id: academyId }, "Meet Outsider"); // same academy, NOT in the batch
  const [{ id: batchId }] = await rest("/rest/v1/batches", { method: "POST", body: JSON.stringify({ academy_id: academyId, name: `Meet Batch ${stamp}` }) });
  await rest("/rest/v1/batch_mentors", { method: "POST", body: JSON.stringify({ batch_id: batchId, mentor_id: mentorId }) });
  await rest("/rest/v1/batch_students", { method: "POST", body: JSON.stringify({ batch_id: batchId, student_id: studentId }) });

  // ---- Mentor schedules a whole-batch live room starting in ~1–2 minutes ----
  const mentor = await (await browser.newContext(contextOpts)).newPage();
  await logIn(mentor, mentorEmail);
  await expect(mentor).toHaveURL(/\/mentor$/, { timeout: 30_000 });
  const startMs = Math.ceil((Date.now() + 70_000) / 60_000) * 60_000;
  const start = istParts(startMs);
  const end = istParts(startMs + 15 * 60_000);
  await mentor.goto("/mentor/sessions/new");
  await mentor.getByLabel("Title").fill("Live room check");
  await mentor.getByLabel("Date").fill(start.date);
  await mentor.getByLabel("Starts").fill(start.time);
  await mentor.getByLabel("Ends").fill(end.time);
  await mentor.getByRole("button", { name: /schedule session/i }).click();
  await expect(mentor).toHaveURL(/\/mentor\/sessions\/[0-9a-f-]{36}\?scheduled=1/, { timeout: 30_000 });
  const sessionId = mentor.url().match(/sessions\/([0-9a-f-]{36})/)![1];

  // The whole batch sees it automatically — no per-student invitation.
  const student = await (await browser.newContext(contextOpts)).newPage();
  await logIn(student, studentEmail);
  await expect(student).toHaveURL(/\/student$/, { timeout: 30_000 });
  await student.goto("/student/sessions");
  await expect(student.getByText("Live room check")).toBeVisible();

  // An enrolled-in-another-batch student can't even open it.
  const outsider = await (await browser.newContext(contextOpts)).newPage();
  await logIn(outsider, outsiderEmail);
  await expect(outsider).toHaveURL(/\/student$/, { timeout: 30_000 });
  const denied = await outsider.goto(`/student/sessions/${sessionId}/room`);
  expect(denied?.status()).toBe(404);

  // ---- Host starts; student joins ----
  await mentor.goto(`/mentor/sessions/${sessionId}/room`);
  // Join screen: the profile name and a live camera preview (Chromium's fake camera).
  await expect(mentor.getByText(/you'll join as/i)).toContainText("Meet Mentor");
  await expect(mentor.getByLabel("Your camera preview")).toBeVisible({ timeout: 15_000 });
  await hasLiveVideo(mentor);
  await mentor.getByRole("button", { name: /start or rejoin meeting/i }).click();
  await expect(mentor.getByRole("tab", { name: /participants \(1\)/i })).toBeVisible({ timeout: 30_000 });
  await student.goto(`/student/sessions/${sessionId}`);
  await student.getByRole("link", { name: /join meeting/i }).click();
  await student.getByRole("button", { name: /^join meeting$/i }).click();
  await expect(mentor.getByRole("tab", { name: /participants \(2\)/i })).toBeVisible({ timeout: 30_000 });
  await expect(student.getByRole("tab", { name: /participants \(2\)/i })).toBeVisible({ timeout: 30_000 });

  // Media: the student receives the host's camera and microphone.
  await hasLiveVideo(student);
  await expect.poll(() => remoteAudioTracks(student), { timeout: 20_000 }).toBeGreaterThan(0);

  // Batch student: listen-only (mic disabled with the reason), no host controls.
  await expect(student.getByRole("button", { name: /^unmute$/i })).toHaveAttribute("aria-disabled", "true");
  await expect(student.getByRole("button", { name: /^end meeting$/i })).toHaveCount(0);
  await expect(student.getByRole("button", { name: /actions for/i })).toHaveCount(0);

  // Chat both ways (stored + broadcast by the server).
  await student.getByRole("button", { name: /^chat$/i }).click();
  await student.getByLabel("Message everyone").fill("Hello from the student");
  await student.getByRole("button", { name: /send message/i }).click();
  await expect(mentor.getByRole("tab", { name: /chat/i })).toContainText("1", { timeout: 15_000 }); // unread badge
  await mentor.getByRole("tab", { name: /chat/i }).click();
  await expect(mentor.getByRole("log", { name: /chat messages/i })).toContainText("Hello from the student");
  await mentor.getByLabel("Message everyone").fill("Welcome, everyone");
  await mentor.getByRole("button", { name: /send message/i }).click();
  await expect(student.getByRole("log", { name: /chat messages/i })).toContainText("Welcome, everyone", { timeout: 15_000 });

  // A reaction reaches the host.
  await student.getByRole("button", { name: /^reactions$/i }).click();
  await student.getByRole("button", { name: "React 👏" }).click();
  await expect(mentor.getByRole("list", { name: "Reactions" })).toContainText("Meet Student", { timeout: 15_000 });

  // Raise hand → the host sees it → the host lowers all hands.
  await student.getByRole("button", { name: /^raise hand$/i }).click();
  await mentor.getByRole("tab", { name: /participants/i }).click();
  await expect(mentor.getByText(/1 hand raised/i)).toBeVisible({ timeout: 15_000 });
  // The host's queue lowers one hand…
  await mentor.getByRole("button", { name: "Lower Meet Student's hand" }).click();
  await expect(student.getByRole("button", { name: /^raise hand$/i })).toBeVisible({ timeout: 15_000 });
  // …and "lower all hands" clears the rest.
  await student.getByRole("button", { name: /^raise hand$/i }).click();
  await expect(mentor.getByText(/1 hand raised/i)).toBeVisible({ timeout: 15_000 });
  await mentor.getByRole("button", { name: /^more$/i }).click();
  await mentor.getByRole("menuitem", { name: /lower all hands/i }).click();
  await expect(student.getByRole("button", { name: /^raise hand$/i })).toBeVisible({ timeout: 15_000 });

  // The host lets the student speak → the student unmutes → the host hears them.
  await mentor.getByRole("button", { name: /actions for meet student/i }).click();
  await mentor.getByRole("menuitem", { name: /^allow to speak$/i }).click();
  await expect(student.getByText(/let you speak/i)).toBeVisible({ timeout: 20_000 });
  await student.getByRole("button", { name: /^unmute$/i }).click();
  await expect(student.getByRole("button", { name: /^mute$/i })).toBeVisible({ timeout: 30_000 }); // mic published
  await expect.poll(() => remoteAudioTracks(mentor), { timeout: 45_000 }).toBeGreaterThan(0);

  // The host mutes the student → the student is told who did it.
  await mentor.getByRole("button", { name: /actions for meet student/i }).click();
  await mentor.getByRole("menuitem", { name: /^mute microphone$/i }).click();
  await expect(student.getByText(/host muted your microphone/i)).toBeVisible({ timeout: 20_000 });
  await expect(student.getByRole("button", { name: /^unmute$/i })).toBeVisible();

  // Speaker view (pin a tile) and the in-room device settings.
  await mentor.getByRole("button", { name: /^more$/i }).click();
  await mentor.getByRole("menuitem", { name: /switch to speaker view/i }).click();
  await mentor.getByRole("button", { name: "Pin Meet Student to the main view" }).click();
  await expect(mentor.getByRole("button", { name: "Unpin Meet Student" })).toBeVisible();
  await mentor.getByRole("button", { name: /^more$/i }).click();
  await mentor.getByRole("menuitem", { name: /audio and video settings/i }).click();
  await expect(mentor.getByRole("dialog")).toContainText("Microphone");
  await mentor.keyboard.press("Escape");

  // Leaving is not ending: the student leaves, the meeting continues, they rejoin.
  await student.getByRole("button", { name: /^leave$/i }).click();
  await expect(student.getByText(/you left the meeting/i)).toBeVisible({ timeout: 15_000 });
  await expect(mentor.getByRole("tab", { name: /participants \(1\)/i })).toBeVisible({ timeout: 30_000 });
  expect((await rest(`/rest/v1/sessions?id=eq.${sessionId}&select=status`))[0].status).toBe("scheduled");
  await student.getByRole("button", { name: /back to the join screen/i }).click();
  await student.getByRole("button", { name: /^join meeting$/i }).click();
  await expect(mentor.getByRole("tab", { name: /participants \(2\)/i })).toBeVisible({ timeout: 30_000 });

  // Signed webhooks recorded the visits (two for the student: join, leave, rejoin).
  await expect
    .poll(async () => (await rest(`/rest/v1/live_meeting_attendance?session_id=eq.${sessionId}&user_id=eq.${studentId}&select=participant_sid`)).length, { timeout: 20_000 })
    .toBe(2);

  // ---- End for everyone, past the scheduled start ----
  await mentor.waitForTimeout(Math.max(0, startMs - Date.now() + 2_000));
  await mentor.getByRole("button", { name: /^end meeting$/i }).click();
  await expect(mentor.getByRole("dialog")).toContainText(/end the meeting for everyone/i);
  await mentor.getByRole("button", { name: /^end for everyone$/i }).click();
  await expect(mentor.getByText(/the meeting has ended/i)).toBeVisible({ timeout: 45_000 });
  await expect(student.getByText(/the meeting has ended/i)).toBeVisible({ timeout: 45_000 });

  const [session] = await rest(`/rest/v1/sessions?id=eq.${sessionId}&select=status,actual_started_at,actual_ended_at,attendance_finalized_at`);
  expect(session.status).toBe("completed");
  expect(session.actual_ended_at).toBeTruthy();
  expect(session.attendance_finalized_at).toBeTruthy();
  const rows = await rest(`/rest/v1/live_meeting_attendance?session_id=eq.${sessionId}&select=user_id,left_at`);
  expect(rows.every((r: { left_at: string | null }) => r.left_at !== null)).toBe(true);
  // 75% rule: ended a few seconds after the scheduled start of a 15-minute
  // meeting → far below 11:15 of eligible time → Absent, with the seconds kept.
  const [mark] = await rest(`/rest/v1/session_attendance?session_id=eq.${sessionId}&select=student_id,status,marked_by,connected_seconds,required_seconds`);
  expect(mark).toMatchObject({ student_id: studentId, status: "absent", marked_by: null, required_seconds: 675 });
  expect(mark.connected_seconds).toBeLessThan(675);

  // Rejoining after the end is refused.
  await student.goto(`/student/sessions/${sessionId}/room`);
  await expect(student.getByText(/this meeting has ended/i)).toBeVisible();

  // The host's session page shows connected time and the result.
  await mentor.goto(`/mentor/sessions/${sessionId}`);
  await expect(mentor.getByRole("row", { name: /meet student/i })).toContainText(/absent/i);
  await expect(mentor.getByRole("cell", { name: /meet mentor \(host\)/i })).toBeVisible();

  await browser.close();
});
