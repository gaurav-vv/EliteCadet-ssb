import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Academy-admin notifications (migration 0035) against the LOCAL Supabase stack: `npm run dev:local` plus the
// local URL, anon key and service key in the environment. The API tests sign in as real users and read the
// notifications table the way the app does, so they prove the triggers and RLS, not just the page. It creates
// accounts, so it refuses to run against anything but a local stack.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!URL || !ANON || !SERVICE || !/^http:\/\/(127\.0\.0\.1|localhost):/.test(URL), "needs the LOCAL stack's URL, anon key and service key in the environment");

const PASSWORD = "notify-test-pass-123";
const stamp = Date.now();
let counter = 0;
const email = (label: string) => `${label}.${stamp}.${counter++}@example.test`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

type User = { id: string; email: string; name: string };

const service = () => createClient(URL!, SERVICE!, opts);

async function makeUser(role: string, name: string, extra: Record<string, unknown> = {}): Promise<User> {
  const address = email(role);
  const { data, error } = await service().auth.admin.createUser({
    email: address,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role, ...extra },
    user_metadata: { full_name: name },
  });
  if (error || !data.user) throw new Error(`could not create ${role}: ${error?.message}`);
  return { id: data.user.id, email: address, name };
}

// Signing in is what sets auth.users.last_sign_in_at, i.e. the "first sign-in" the trigger reacts to.
async function signIn(user: User): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON!, opts);
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: PASSWORD });
  if (error) throw new Error(`could not sign in ${user.email}: ${error.message}`);
  return client;
}

async function inbox(client: SupabaseClient, kind?: string) {
  let query = client.from("notifications").select("kind, title, body, href, read_at").order("created_at", { ascending: true });
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  expect(error).toBeNull();
  return data ?? [];
}

test.describe.configure({ mode: "serial" });

test.describe("academy admin notifications (database level)", () => {
  let adminA: User, adminB: User, mentor: User, student: User, indie: User;
  let academyA: string, batchId: string;
  let adminAClient: SupabaseClient, adminBClient: SupabaseClient;

  test.beforeAll(async () => {
    const admin = service();
    adminA = await makeUser("academy_admin", "Notify Admin A");
    adminB = await makeUser("academy_admin", "Notify Admin B");
    const { data: row } = await admin.from("profiles").select("academy_id").eq("id", adminA.id).single();
    academyA = row!.academy_id as string;
    mentor = await makeUser("mentor", `Notify Mentor ${stamp}`, { academy_id: academyA });
    student = await makeUser("student", `Notify Student ${stamp}`);
    await admin.from("profiles").update({ academy_id: academyA }).eq("id", student.id);
    indie = await makeUser("mentor", "Notify Independent");

    const { data: batch, error } = await admin.from("batches").insert({ academy_id: academyA, name: `Notify Batch ${stamp}` }).select("id").single();
    expect(error).toBeNull();
    batchId = batch!.id;
    expect((await admin.from("batch_mentors").insert({ batch_id: batchId, mentor_id: mentor.id })).error).toBeNull();
    expect((await admin.from("batch_students").insert({ batch_id: batchId, student_id: student.id })).error).toBeNull();

    [adminAClient, adminBClient] = await Promise.all([signIn(adminA), signIn(adminB)]);
  });

  test("before anyone signs in the academy admin has no join notifications", async () => {
    expect(await inbox(adminAClient, "invite_accepted")).toEqual([]);
  });

  test("a mentor's first sign-in notifies the academy's admin once, and nobody else", async () => {
    const mentorClient = await signIn(mentor);
    const mine = await inbox(adminAClient, "invite_accepted");
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ title: `${mentor.name} joined your academy`, href: "/academy/mentors", read_at: null });
    expect(mine[0].body).toMatch(/mentor accepted the invitation/i);

    // Another academy's admin is told nothing, and the mentor cannot read the admin's notifications.
    expect(await inbox(adminBClient, "invite_accepted")).toEqual([]);
    expect(await inbox(mentorClient, "invite_accepted")).toEqual([]);

    // Signing in again is not "joining" again.
    await signIn(mentor);
    expect(await inbox(adminAClient, "invite_accepted")).toHaveLength(1);
  });

  test("a student's first sign-in links to the Students page", async () => {
    await signIn(student);
    const list = await inbox(adminAClient, "invite_accepted");
    expect(list).toHaveLength(2);
    expect(list[1]).toMatchObject({ title: `${student.name} joined your academy`, href: "/academy/students" });
  });

  test("an independent mentor (no academy) signing in notifies no academy admin", async () => {
    await signIn(indie);
    expect(await inbox(adminAClient, "invite_accepted")).toHaveLength(2);
    expect(await inbox(adminBClient, "invite_accepted")).toEqual([]);
  });

  test("a session scheduled by a mentor notifies the academy's admin; the students' own notice is unchanged", async () => {
    const mentorClient = await signIn(mentor);
    const starts = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    const ends = new Date(starts.getTime() + 3600 * 1000);
    const { error } = await mentorClient.from("sessions").insert({
      academy_id: academyA,
      batch_id: batchId,
      mentor_id: mentor.id,
      created_by: mentor.id,
      title: `Group discussion ${stamp}`,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      mode: "online",
      meeting_url: "https://meet.example.test/notify",
      for_whole_batch: true,
    });
    expect(error).toBeNull();

    const list = await inbox(adminAClient, "session_scheduled");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: `Session scheduled by ${mentor.name}`, href: "/academy/sessions", read_at: null });
    expect(list[0].body).toContain(`Group discussion ${stamp}`);

    expect(await inbox(adminBClient, "session_scheduled")).toEqual([]);
    // The existing student notification still arrives (this migration did not touch it).
    const studentClient = await signIn(student);
    expect(await inbox(studentClient, "session_scheduled")).toHaveLength(1);
  });

  test("a session that is already in the past notifies nobody", async () => {
    const past = new Date(Date.now() - 3 * 24 * 3600 * 1000);
    const { error } = await service().from("sessions").insert({
      academy_id: academyA,
      batch_id: batchId,
      mentor_id: mentor.id,
      created_by: mentor.id,
      title: `Old session ${stamp}`,
      starts_at: past.toISOString(),
      ends_at: new Date(past.getTime() + 3600 * 1000).toISOString(),
      mode: "online",
      meeting_url: "https://meet.example.test/old",
      for_whole_batch: true,
    });
    expect(error).toBeNull();
    expect(await inbox(adminAClient, "session_scheduled")).toHaveLength(1);
  });

  test("an admin can mark their notification read, and only their own", async () => {
    const before = await adminAClient.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    const unread = before.count ?? 0;
    expect(unread).toBeGreaterThanOrEqual(3);
    const { data: mine } = await adminAClient.from("notifications").select("id").eq("kind", "invite_accepted").limit(1);
    const marked = await adminAClient.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", mine![0].id).select("id");
    expect(marked.data).toHaveLength(1);
    // Another admin cannot touch it.
    const stolen = await adminBClient.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", mine![0].id).select("id");
    expect(stolen.data ?? []).toEqual([]);
  });
});

async function logIn(page: Page, user: User) {
  await page.goto("/login");
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return Boolean(form && Object.keys(form).some((key) => key.startsWith("__reactProps$")));
  });
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /^log in$/i }).click();
}

test.describe("academy admin notifications (browser)", () => {
  test("the admin sees the join notification on their Notifications page and in the bell", async ({ browser }) => {
    test.setTimeout(180_000);
    const admin = await makeUser("academy_admin", "UI Notify Admin");
    const { data: row } = await service().from("profiles").select("academy_id").eq("id", admin.id).single();
    const mentor = await makeUser("mentor", `UI Notify Mentor ${stamp}`, { academy_id: row!.academy_id });

    await signIn(mentor); // the first sign-in that notifies the admin

    const page = await (await browser.newContext()).newPage();
    await logIn(page, admin);
    await expect(page).toHaveURL(/\/academy$/, { timeout: 30_000 });
    await page.goto("/academy/notifications");
    await expect(page.getByText(`${mentor.name} joined your academy`).first()).toBeVisible({ timeout: 30_000 });
  });
});
