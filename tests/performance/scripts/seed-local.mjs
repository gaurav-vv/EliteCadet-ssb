#!/usr/bin/env node
// Seeds the LOCAL Supabase stack with dedicated performance-test accounts (one per
// role) and a modest, realistic data set, then writes tests/performance/.env.perf.
//
//   npx supabase start ...      # local stack must be running
//   node tests/performance/scripts/seed-local.mjs
//
// Safety: refuses any Supabase URL that is not localhost. Uses the local stack's own
// service key to create the accounts (that is how a local test stack is seeded); that
// key never reaches the perf runner, which signs in with the public key and a password.
// Passwords are random per run and are written only to the git-ignored .env.perf,
// never printed. Data is created only when it is missing, so re-running is safe.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));

function localStatus() {
  const r = spawnSync("npx", ["-y", "supabase@2", "status", "-o", "env"], { encoding: "utf8", shell: true, cwd: path.join(here, "..", "..", "..") });
  const vars = Object.fromEntries(
    (r.stdout ?? "")
      .split("\n")
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
  if (!vars.API_URL || !vars.SERVICE_ROLE_KEY || !vars.ANON_KEY) throw new Error("`supabase status` did not report the local keys. Is the local stack running (docker + npx supabase start)?");
  if (!["127.0.0.1", "localhost"].includes(new URL(vars.API_URL).hostname)) throw new Error(`Refusing to seed ${vars.API_URL}: not a local Supabase stack.`);
  return vars;
}

const password = () => randomBytes(18).toString("base64url");
const ACCOUNTS = {
  academy_admin: { key: "ACADEMY", email: "perf.academy@perf.test", name: "Perf Academy Admin" },
  mentor: { key: "MENTOR", email: "perf.mentor@perf.test", name: "Perf Mentor" },
  student: { key: "STUDENT", email: "perf.student@perf.test", name: "Perf Student Zero" },
  super_admin: { key: "ADMIN", email: "perf.admin@perf.test", name: "Perf Super Admin" },
};
const EXTRA_STUDENTS = 11;
// Names that exist only in the second academy. Written to .env.perf as markers.
const FOREIGN = { admin: "Zeta Foreign Admin", mentor: "Zeta Foreign Mentor", student: "Zeta Foreign Student" };

async function main() {
  const vars = localStatus();
  const admin = createClient(vars.API_URL, vars.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const creds = {};

  async function ensureUser({ email, name, role, academyId }) {
    const pw = password();
    const meta = { role, ...(academyId ? { academy_id: academyId } : {}) };
    const { data, error } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { full_name: name, academy_name: role === "academy_admin" ? "Perf Academy" : null }, app_metadata: meta });
    if (error && !/already|exists/i.test(error.message)) throw new Error(`could not create ${role}: ${error.message}`);
    let id = data?.user?.id;
    if (!id) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      id = list.users.find((u) => u.email === email)?.id;
      await admin.auth.admin.updateUserById(id, { password: pw });
    }
    return { id, password: pw };
  }

  // 1. Academy admin first: the signup trigger creates the academy.
  const a = ACCOUNTS.academy_admin;
  const academyAdmin = await ensureUser({ email: a.email, name: a.name, role: "academy_admin" });
  creds.academy_admin = academyAdmin;
  const { data: prof, error: pErr } = await admin.from("profiles").select("academy_id").eq("id", academyAdmin.id).single();
  if (pErr || !prof?.academy_id) throw new Error("academy admin has no academy (are all migrations applied?)");
  const academyId = prof.academy_id;

  // 2. Everyone else belongs to that academy (trusted via app_metadata, set server-side).
  creds.mentor = await ensureUser({ email: ACCOUNTS.mentor.email, name: ACCOUNTS.mentor.name, role: "mentor", academyId });
  creds.student = await ensureUser({ email: ACCOUNTS.student.email, name: ACCOUNTS.student.name, role: "student", academyId });
  creds.super_admin = await ensureUser({ email: ACCOUNTS.super_admin.email, name: ACCOUNTS.super_admin.name, role: "super_admin" });
  const studentIds = [creds.student.id];
  for (let i = 1; i <= EXTRA_STUDENTS; i++) {
    const s = await ensureUser({ email: `perf.student${i}@perf.test`, name: `Perf Student ${i}`, role: "student", academyId });
    studentIds.push(s.id);
  }

  // 3. Data: one batch, all students and the mentor in it, assessments with reviewed
  // attempts (so progress charts have points) and upcoming sessions.
  let { data: batch } = await admin.from("batches").select("id").eq("academy_id", academyId).eq("name", "Perf Batch").maybeSingle();
  if (!batch) ({ data: batch } = await admin.from("batches").insert({ academy_id: academyId, name: "Perf Batch", status: "active", start_date: "2026-10-01" }).select("id").single());
  await admin.from("batch_mentors").upsert({ batch_id: batch.id, mentor_id: creds.mentor.id, assigned_by: academyAdmin.id });
  for (const sid of studentIds) await admin.from("batch_students").upsert({ batch_id: batch.id, student_id: sid, added_by: academyAdmin.id }, { onConflict: "batch_id,student_id", ignoreDuplicates: true });

  // An earlier interrupted run can leave assessments without attempts; start those over
  // (this is the local stack, and only the seed batch's own assessments).
  const { count: attemptCount } = await admin.from("assessment_attempts").select("id", { count: "exact", head: true });
  if (!attemptCount) await admin.from("assessments").delete().eq("batch_id", batch.id);
  const { count: existing } = await admin.from("assessments").select("id", { count: "exact", head: true }).eq("batch_id", batch.id);
  if (!existing) {
    const categories = ["psychology", "interview", "gto"];
    for (let n = 0; n < 3; n++) {
      const { data: asmt, error } = await admin.from("assessments").insert({ academy_id: academyId, batch_id: batch.id, mentor_id: creds.mentor.id, title: `Perf Assessment ${n + 1}`, instructions: "Performance-test data.", category: categories[n], questions: [{ id: "q1", prompt: "Describe a time you led a team." }, { id: "q2", prompt: "What motivates you?" }], max_score: 10, status: "published", published_at: new Date().toISOString() }).select("id").single();
      if (error) throw new Error(`assessment insert failed: ${error.message}`);
      for (const [i, sid] of studentIds.slice(0, 8).entries()) {
        const { data: attempt, error: aErr } = await admin.from("assessment_attempts").insert({ assessment_id: asmt.id, student_id: sid, answers: [{ questionId: "q1", answer: "Sample answer." }, { questionId: "q2", answer: "Sample answer." }], status: "submitted", submitted_at: new Date(Date.now() - (n + 1) * 86_400_000).toISOString() }).select("id").single();
        if (aErr) throw new Error(`attempt insert failed: ${aErr.message}`);
        const { error: fErr } = await admin.from("feedback").insert({ attempt_id: attempt.id, mentor_id: creds.mentor.id, score: 4 + ((i + n) % 6), strengths: "Clear structure.", improvement_areas: "Add concrete examples.", comments: "Performance-test data.", status: "reviewed", reviewed_at: new Date().toISOString() });
        if (fErr) throw new Error(`feedback insert failed: ${fErr.message}`);
      }
    }
  }
  const { count: sess } = await admin.from("sessions").select("id", { count: "exact", head: true }).eq("batch_id", batch.id);
  if (!sess) {
    for (let n = 1; n <= 3; n++) {
      const start = new Date(Date.now() + n * 86_400_000);
      const { data: s, error } = await admin.from("sessions").insert({ academy_id: academyId, batch_id: batch.id, mentor_id: creds.mentor.id, created_by: creds.mentor.id, title: `Perf Session ${n}`, description: "Performance-test data.", starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 3_600_000).toISOString(), mode: "online", meeting_url: "https://meet.example.com/perf", for_whole_batch: true, status: "scheduled" }).select("id").single();
      if (error) throw new Error(`session insert failed: ${error.message}`);
      await admin.from("session_participants").upsert(studentIds.map((student_id) => ({ session_id: s.id, student_id })), { ignoreDuplicates: true });
    }
  }

  // 3b. A SECOND academy with its own people and data, used only to prove isolation:
  // nobody in the first academy may ever see these names (the super admin may).
  const other = await ensureUser({ email: "perf.other.academy@perf.test", name: FOREIGN.admin, role: "academy_admin" });
  const { data: otherProf } = await admin.from("profiles").select("academy_id").eq("id", other.id).single();
  const otherAcademyId = otherProf?.academy_id;
  if (otherAcademyId) {
    const otherMentor = await ensureUser({ email: "perf.other.mentor@perf.test", name: FOREIGN.mentor, role: "mentor", academyId: otherAcademyId });
    const otherStudent = await ensureUser({ email: "perf.other.student@perf.test", name: FOREIGN.student, role: "student", academyId: otherAcademyId });
    let { data: ob } = await admin.from("batches").select("id").eq("academy_id", otherAcademyId).eq("name", "Other Batch").maybeSingle();
    if (!ob) ({ data: ob } = await admin.from("batches").insert({ academy_id: otherAcademyId, name: "Other Batch", status: "active", start_date: "2026-10-01" }).select("id").single());
    await admin.from("batch_mentors").upsert({ batch_id: ob.id, mentor_id: otherMentor.id, assigned_by: other.id });
    await admin.from("batch_students").upsert({ batch_id: ob.id, student_id: otherStudent.id, added_by: other.id }, { onConflict: "batch_id,student_id", ignoreDuplicates: true });
  }

  // 4. Credentials for the runner (public key + passwords) -> ignored file, never stdout.
  const lines = [`PERF_SUPABASE_URL=${vars.API_URL}`, `PERF_SUPABASE_ANON_KEY=${vars.ANON_KEY}`];
  for (const [role, acc] of Object.entries(ACCOUNTS)) lines.push(`PERF_${acc.key}_EMAIL=${acc.email}`, `PERF_${acc.key}_PASSWORD=${creds[role].password}`, `PERF_${acc.key}_NAME=${acc.name}`);
  lines.push(`PERF_FOREIGN_MARKERS=${Object.values(FOREIGN).join("|")}`);
  lines.push(`PERF_PEER_MARKERS=${Array.from({ length: EXTRA_STUDENTS }, (_, i) => `Perf Student ${i + 1}`).join("|")}`);
  writeFileSync(path.join(here, "..", ".env.perf"), `${lines.join("\n")}\n`);
  console.log(`Seeded local stack: 1 academy, 1 batch, ${studentIds.length} students, 1 mentor, 1 academy admin, 1 super admin, 3 assessments, 3 sessions.`);
  console.log("Wrote tests/performance/.env.perf (git-ignored; contains the local test passwords).");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
