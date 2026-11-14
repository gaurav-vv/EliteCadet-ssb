#!/usr/bin/env node
// Seeds a realistic academy (default 300 students, 12 batches, 8 mentors, 6 assessments per batch, sessions
// and attendance) into the LOCAL Supabase database so the dashboards can be profiled with real volume.
//
//   npm run perf:seed-dashboards                     # defaults
//   npm run perf:seed-dashboards -- --students 600   # a bigger academy
//
// LOCAL ONLY: it refuses any Supabase URL that is not 127.0.0.1/localhost, and it talks to Postgres through
// `docker exec` into the local stack's own database container. It never reads .env.local.
// Prints a login for the academy admin, one student and one mentor (all test data, password below).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, all) => (a.startsWith("--") ? [[a.slice(2), all[i + 1]]] : [])),
);
const students = Number(args.students ?? 300);
const batches = Number(args.batches ?? 12);
const mentors = Number(args.mentors ?? 8);
const aper = Number(args.aper ?? 6);
const PASSWORD = "seeded-load-pass-123";
const CONTAINER = "supabase_db_elitecadet-ssb";

function localStack() {
  const out = execFileSync("npx", ["-y", "supabase@2", "status", "-o", "env"], { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "ignore"] });
  const get = (k) => out.match(new RegExp(`^${k}="?([^"\\n]*)"?$`, "m"))?.[1];
  return { url: get("API_URL"), service: get("SERVICE_ROLE_KEY") };
}

const { url, service } = localStack();
if (!url || !service || !/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) {
  console.error(`Refusing to run: ${url} is not a local Supabase stack.`);
  process.exit(1);
}

async function admin(path, init = {}) {
  const r = await fetch(`${url}/auth/v1/admin${path}`, {
    ...init,
    headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`${path} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

const stamp = Date.now().toString(36);
const adminEmail = `load.admin.${stamp}@example.test`;
const created = await admin("/users", {
  method: "POST",
  body: JSON.stringify({ email: adminEmail, password: PASSWORD, email_confirm: true, app_metadata: { role: "academy_admin" }, user_metadata: { full_name: "Load Admin", academy_name: `Load Academy ${stamp}` } }),
});
const academyId = execFileSync("docker", ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-X", "-t", "-A", "-c", `select academy_id from public.profiles where id = '${created.id}'`], { encoding: "utf8" }).trim();
if (!/^[0-9a-f-]{36}$/.test(academyId)) throw new Error(`could not find the new academy (got "${academyId}")`);

const sqlFile = fileURLToPath(new URL("./seed-dashboard-load.sql", import.meta.url));
const output = execFileSync("docker", ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-X", "-v", `academy=${academyId}`, "-v", `stamp=${stamp}`, "-v", `students=${students}`, "-v", `batches=${batches}`, "-v", `mentors=${mentors}`, "-v", `aper=${aper}`], {
  encoding: "utf8",
  input: readFileSync(sqlFile, "utf8"),
});
console.log(output.trim());

// Give one student and one mentor a password so the dashboards can be opened in a browser.
const emails = { student: `load.student.${stamp}.1@example.test`, mentor: `load.mentor.${stamp}.1@example.test` };
for (const email of Object.values(emails)) {
  const id = execFileSync("docker", ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-X", "-t", "-A", "-c", `select id from auth.users where email = '${email}'`], { encoding: "utf8" }).trim();
  await admin(`/users/${id}`, { method: "PUT", body: JSON.stringify({ password: PASSWORD, email_confirm: true }) });
}

console.log(`\nSeeded academy ${academyId} (stamp ${stamp}).`);
console.log(`Logins (password ${PASSWORD}):\n  academy admin  ${adminEmail}\n  student        ${emails.student}\n  mentor         ${emails.mentor}`);
