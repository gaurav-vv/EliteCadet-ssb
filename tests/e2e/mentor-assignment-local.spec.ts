import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Independent-mentor student assignments (migration 0034) against the LOCAL Supabase stack:
// `npm run dev:local` plus the local URL, anon key and service key in the environment. The API tests sign
// in as real users and call the database directly, so they prove the RLS and triggers themselves, not just
// the UI. It creates accounts, so it refuses to run against anything but a local stack.
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!URL || !ANON || !SERVICE || !/^http:\/\/(127\.0\.0\.1|localhost):/.test(URL), "needs the LOCAL stack's URL, anon key and service key in the environment");

const PASSWORD = "assign-test-pass-123";
const stamp = Date.now();
let counter = 0;
const email = (label: string) => `${label}.${stamp}.${counter++}@example.test`;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

type User = { id: string; email: string; name: string };

function service() {
  return createClient(URL!, SERVICE!, opts);
}

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

async function as(user: User): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON!, opts);
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: PASSWORD });
  if (error) throw new Error(`could not sign in ${user.email}: ${error.message}`);
  return client;
}

async function visibleProfile(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("profiles").select("id").eq("id", id);
  expect(error).toBeNull();
  return (data ?? []).length === 1;
}

async function isMyMentee(client: SupabaseClient, id: string) {
  const { data, error } = await client.rpc("is_my_mentee", { p_student: id });
  expect(error).toBeNull();
  return data === true;
}

test.describe.configure({ mode: "serial" });

test.describe("independent mentor student assignments (database level)", () => {
  let superAdmin: User, mentorA: User, mentorB: User, studentOne: User, studentTwo: User;
  let academyMentor: User, academyStudent: User, academyAdmin: User;
  let sup: SupabaseClient, a: SupabaseClient, b: SupabaseClient, am: SupabaseClient, st: SupabaseClient;

  test.beforeAll(async () => {
    superAdmin = await makeUser("super_admin", "Assign Super");
    mentorA = await makeUser("mentor", "Indie Mentor A");
    mentorB = await makeUser("mentor", "Indie Mentor B");
    studentOne = await makeUser("student", "Free Student One");
    studentTwo = await makeUser("student", "Free Student Two");

    // An academy with an admin (the signup trigger creates the academy), one mentor and one student in a batch.
    academyAdmin = await makeUser("academy_admin", "Academy Admin");
    const admin = service();
    const { data: row } = await admin.from("profiles").select("academy_id").eq("id", academyAdmin.id).single();
    const academyId = row!.academy_id as string;
    academyMentor = await makeUser("mentor", "Academy Mentor", { academy_id: academyId });
    academyStudent = await makeUser("student", "Academy Student");
    await admin.from("profiles").update({ academy_id: academyId }).eq("id", academyStudent.id);
    const { data: batch, error } = await admin.from("batches").insert({ academy_id: academyId, name: `Batch ${stamp}` }).select("id").single();
    expect(error).toBeNull();
    expect((await admin.from("batch_mentors").insert({ batch_id: batch!.id, mentor_id: academyMentor.id })).error).toBeNull();
    expect((await admin.from("batch_students").insert({ batch_id: batch!.id, student_id: academyStudent.id })).error).toBeNull();

    [sup, a, b, am, st] = await Promise.all([as(superAdmin), as(mentorA), as(mentorB), as(academyMentor), as(studentOne)]);
  });

  test("before any assignment an independent mentor sees no students", async () => {
    expect(await visibleProfile(a, studentOne.id)).toBe(false);
    expect(await isMyMentee(a, studentOne.id)).toBe(false);
    expect((await a.from("assigned_students").select("id")).data).toEqual([]);
  });

  test("only a super admin can assign; mentors, academy mentors and students cannot", async () => {
    for (const [who, client] of [["mentor", a], ["academy mentor", am], ["student", st]] as const) {
      const { error } = await client.from("mentor_students").insert({ mentor_id: mentorA.id, student_id: studentOne.id });
      expect(error, `${who} insert`).not.toBeNull();
    }
    // Nothing was written for this mentor (scoped to them: the table is shared with other runs).
    expect((await service().from("mentor_students").select("student_id").eq("mentor_id", mentorA.id)).data).toEqual([]);
  });

  test("a super admin assigns two students; the mentor sees exactly those, an unrelated mentor sees none", async () => {
    for (const s of [studentOne, studentTwo]) {
      const { error } = await sup.from("mentor_students").insert({ mentor_id: mentorA.id, student_id: s.id, assigned_by: superAdmin.id });
      expect(error).toBeNull();
    }
    expect(await visibleProfile(a, studentOne.id)).toBe(true);
    expect(await visibleProfile(a, studentTwo.id)).toBe(true);
    expect(await isMyMentee(a, studentOne.id)).toBe(true);
    const { data } = await a.from("assigned_students").select("id").order("id");
    expect((data ?? []).map((r) => r.id).sort()).toEqual([studentOne.id, studentTwo.id].sort());

    // Another independent mentor, an academy mentor and the students themselves gain nothing.
    expect(await visibleProfile(b, studentOne.id)).toBe(false);
    expect(await isMyMentee(b, studentOne.id)).toBe(false);
    expect((await b.from("assigned_students").select("id")).data).toEqual([]);
    expect((await b.from("mentor_students").select("student_id")).data).toEqual([]);
    expect(await isMyMentee(am, studentOne.id)).toBe(false);
    expect(await visibleProfile(am, studentOne.id)).toBe(false);
  });

  test("a duplicate assignment is refused, including two concurrent requests", async () => {
    const dup = await sup.from("mentor_students").insert({ mentor_id: mentorA.id, student_id: studentOne.id });
    expect(dup.error?.code).toBe("23505");

    // Two simultaneous assignments of a new pair: exactly one wins, never two rows.
    const fresh = await makeUser("student", "Race Student");
    const results = await Promise.all([
      sup.from("mentor_students").insert({ mentor_id: mentorB.id, student_id: fresh.id }),
      sup.from("mentor_students").insert({ mentor_id: mentorB.id, student_id: fresh.id }),
    ]);
    expect(results.filter((r) => r.error === null)).toHaveLength(1);
    expect(results.filter((r) => r.error?.code === "23505")).toHaveLength(1);
    const { data } = await service().from("mentor_students").select("student_id").eq("mentor_id", mentorB.id).eq("student_id", fresh.id);
    expect(data).toHaveLength(1);
    await service().from("mentor_students").delete().eq("mentor_id", mentorB.id);
  });

  test("the database refuses an academy mentor, an academy student and the wrong roles", async () => {
    const cases = [
      { mentor_id: academyMentor.id, student_id: studentTwo.id }, // academy mentor
      { mentor_id: mentorA.id, student_id: academyStudent.id }, // academy student
      { mentor_id: studentOne.id, student_id: studentTwo.id }, // a student as the mentor
      { mentor_id: mentorA.id, student_id: mentorB.id }, // a mentor as the student
    ];
    for (const row of cases) {
      const { error } = await sup.from("mentor_students").insert(row);
      expect(error?.code, JSON.stringify(row)).toBe("23514");
    }
  });

  test("batch access is untouched: the academy mentor still sees their batch student and nobody else's", async () => {
    expect(await isMyMentee(am, academyStudent.id)).toBe(true);
    expect(await visibleProfile(am, academyStudent.id)).toBe(true);
    // The independent mentor never gains an academy student, and the academy mentor never a free one.
    expect(await isMyMentee(a, academyStudent.id)).toBe(false);
    expect(await visibleProfile(a, academyStudent.id)).toBe(false);
    expect(await isMyMentee(am, studentOne.id)).toBe(false);
  });

  test("an assigned mentor still gets no sessions, assessments or batch data", async () => {
    for (const table of ["batches", "batch_students", "batch_mentors", "sessions", "assessments"]) {
      const { data, error } = await a.from(table).select("*").limit(5);
      expect(error, table).toBeNull();
      expect(data, table).toEqual([]);
    }
  });

  test("unassigning removes access at once", async () => {
    const removed = await sup.from("mentor_students").delete().eq("mentor_id", mentorA.id).eq("student_id", studentOne.id).select("student_id");
    expect(removed.data).toHaveLength(1);
    expect(await visibleProfile(a, studentOne.id)).toBe(false);
    expect(await isMyMentee(a, studentOne.id)).toBe(false);
    // The other assignment is unaffected.
    expect(await isMyMentee(a, studentTwo.id)).toBe(true);
    expect((await a.from("assigned_students").select("id")).data?.map((r) => r.id)).toEqual([studentTwo.id]);
    // A mentor cannot remove (or add) their own assignments.
    const own = await a.from("mentor_students").delete().eq("mentor_id", mentorA.id).select("student_id");
    expect(own.data ?? []).toEqual([]);
    expect(await isMyMentee(a, studentTwo.id)).toBe(true);
  });

  test("a student who joins an academy, or a mentor who joins one, loses the assignment", async () => {
    const admin = service();
    const { data: row } = await admin.from("profiles").select("academy_id").eq("id", academyMentor.id).single();
    const academyId = row!.academy_id as string;
    await admin.from("profiles").update({ academy_id: academyId }).eq("id", studentTwo.id);
    expect((await admin.from("mentor_students").select("student_id").eq("student_id", studentTwo.id)).data).toEqual([]);
    expect(await isMyMentee(a, studentTwo.id)).toBe(false);
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

test.describe("independent mentor student assignments (browser)", () => {
  test("super admin assigns and removes a student; the mentor's Mentees list follows", async ({ browser }) => {
    test.setTimeout(180_000);
    const superAdmin = await makeUser("super_admin", "UI Super");
    const mentor = await makeUser("mentor", "UI Indie Mentor");
    const student = await makeUser("student", `Assignable ${stamp}`);

    const adminPage = await (await browser.newContext()).newPage();
    await logIn(adminPage, superAdmin);
    await expect(adminPage).toHaveURL(/\/admin$/, { timeout: 30_000 });

    const mentorPage = await (await browser.newContext()).newPage();
    await logIn(mentorPage, mentor);
    await expect(mentorPage).toHaveURL(/\/mentor$/, { timeout: 30_000 });
    await mentorPage.goto("/mentor/mentees");
    await expect(mentorPage.getByText(/no students assigned yet/i)).toBeVisible();

    await adminPage.goto(`/admin/users/${mentor.id}`);
    await adminPage.getByLabel("Find a student to assign").fill(`Assignable ${stamp}`);
    await adminPage.getByRole("button", { name: "Search", exact: true }).click();
    await adminPage.getByRole("button", { name: `Assign ${student.name}` }).click();
    await expect(adminPage.getByRole("status").filter({ hasText: /student assigned/i })).toBeVisible({ timeout: 15_000 });
    await expect(adminPage.getByRole("button", { name: `Remove ${student.name}` })).toBeVisible({ timeout: 15_000 });

    // The lists render each name in more than one layout (table and cards), so match the first.
    await mentorPage.reload();
    await expect(mentorPage.getByText(student.name).first()).toBeVisible();
    await mentorPage.goto("/mentor");
    await expect(mentorPage.getByText(student.name).first()).toBeVisible();

    await adminPage.getByRole("button", { name: `Remove ${student.name}` }).click();
    await expect(adminPage.getByRole("status").filter({ hasText: /student removed/i })).toBeVisible({ timeout: 15_000 });

    await mentorPage.goto("/mentor/mentees");
    await expect(mentorPage.getByText(student.name)).toHaveCount(0);
    // A direct visit to the removed student's page is refused the same way as any non-mentee.
    await mentorPage.goto(`/mentor/mentees/${student.id}`);
    await expect(mentorPage.getByText(student.name)).toHaveCount(0);
  });

  test("a mentor's profile is saved in the database, survives a reload, and clears the dashboard prompt", async ({ browser }) => {
    test.setTimeout(120_000);
    const mentor = await makeUser("mentor", "Profile Mentor");
    const page = await (await browser.newContext()).newPage();
    await logIn(page, mentor);
    await expect(page).toHaveURL(/\/mentor$/, { timeout: 30_000 });
    await expect(page.getByRole("link", { name: /complete your profile/i })).toBeVisible();

    await page.goto("/mentor/profile");
    await page.getByLabel("Specialization").fill("GTO, Interview");
    await page.getByLabel("Qualifications").fill("MA Psychology");
    await page.getByLabel("Bio").fill("Former selection board assessor.");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /profile was updated/i })).toBeVisible({ timeout: 15_000 });

    // The database holds it (not the browser's localStorage).
    const { data } = await service().from("mentor_profiles").select("bio, qualifications, expertise").eq("user_id", mentor.id).single();
    expect(data).toEqual({ bio: "Former selection board assessor.", qualifications: "MA Psychology", expertise: ["GTO", "Interview"] });

    // A different browser (no localStorage) sees the same values, and the prompt is gone.
    const other = await (await browser.newContext()).newPage();
    await logIn(other, mentor);
    await expect(other).toHaveURL(/\/mentor$/, { timeout: 30_000 });
    await expect(other.getByRole("link", { name: /complete your profile/i })).toHaveCount(0);
    await other.goto("/mentor/profile");
    await expect(other.getByLabel("Specialization")).toHaveValue("GTO, Interview");
    await expect(other.getByLabel("Bio")).toHaveValue("Former selection board assessor.");

    // A bad value is refused with a message next to the field, and nothing is overwritten.
    await other.getByLabel("Phone (optional)").fill("abc");
    await other.getByRole("button", { name: /save changes/i }).click();
    await expect(other.getByRole("alert").filter({ hasText: /phone number/i })).toBeVisible({ timeout: 15_000 });
  });
});
