// DEMO DATA SEED for the Academy domain (integration testing only).
// Imports the same sample batches/students that lib/mock/academy.ts used for its
// in-memory demo ("Load demo data"), into the REAL database, so the Academy pages
// and the integration tests have something to work with. Replace with real data
// later; `--remove` takes only this demo data back out.
//
//   node supabase/seed/demo-academy-data.mjs                 seed into "Preview Academy"
//   node supabase/seed/demo-academy-data.mjs --dry-run       show what would happen, write nothing
//   node supabase/seed/demo-academy-data.mjs --academy "X"   seed into another academy (exact name)
//   node supabase/seed/demo-academy-data.mjs --remove        show what --remove would delete
//   node supabase/seed/demo-academy-data.mjs --remove --confirm   delete ONLY this demo data
//
// Safe by design: inserts only rows that are missing (re-running adds nothing),
// touches only the one named academy, and never deletes anything unless
// --remove --confirm is given. Uses the service-role key from .env.local on your
// machine only (never sent to a browser). No mentors are seeded (no mentor roster
// table yet); students' readiness/last-activity are not stored (no such columns).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const academyArg = args.includes("--academy") ? args[args.indexOf("--academy") + 1] : null;
const ACADEMY_NAME = academyArg ?? "Preview Academy";
const DRY = flag("--dry-run");
const REMOVE = flag("--remove");
const CONFIRM = flag("--confirm");

// Same sample content as DEMO_BATCHES / DEMO_STUDENTS in lib/mock/academy.ts.
const DEMO_BATCHES = ["Batch A", "Batch B", "Batch C"];
const DEMO_STUDENTS = [
  { name: "Priya Nair", batch: "Batch A", status: "active" },
  { name: "Rohit Verma", batch: "Batch A", status: "active" },
  { name: "Sneha Iyer", batch: "Batch B", status: "active" },
  { name: "Arjun Mehta", batch: "Batch B", status: "active" },
  { name: "Kavya Reddy", batch: "Batch A", status: "active" },
  { name: "Vikram Singh", batch: "Batch C", status: "active" },
  { name: "Neha Joshi", batch: "Batch C", status: "active" },
  { name: "Aman Gupta", batch: "Batch B", status: "inactive" },
];

const envText = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
const env = (k) => envText.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
const url = env("NEXT_PUBLIC_SUPABASE_URL")?.replace(/\/+$/, "");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

// ---- the target academy (must match exactly one) ----
const { data: academies, error: aErr } = await sb.from("academies").select("id, name").eq("name", ACADEMY_NAME);
if (aErr) fail(`Could not read academies: ${aErr.message}`);
if (academies.length !== 1) fail(`Expected exactly one academy named "${ACADEMY_NAME}", found ${academies.length}. Use --academy "<exact name>".`);
const academyId = academies[0].id;
console.log(`Target academy: "${ACADEMY_NAME}" (${academyId.slice(0, 8)}…)${DRY ? "  [dry run: nothing is written]" : ""}`);

const { data: existingBatches, error: bErr } = await sb.from("batches").select("id, name, status").eq("academy_id", academyId);
if (bErr) fail(`Could not read batches: ${bErr.message}`);
const batchByName = new Map(existingBatches.map((b) => [b.name.trim().toLowerCase(), b]));

const probe = await sb.from("academy_students").select("id").limit(1);
const studentsTableExists = !probe.error;
if (!studentsTableExists && probe.error.code !== "PGRST205") fail(`Unexpected error probing academy_students: ${probe.error.message}`);

async function loadDemoStudents() {
  const { data, error } = await sb.from("academy_students").select("id, full_name, batch_id").eq("academy_id", academyId);
  if (error) fail(`Could not read students: ${error.message}`);
  return data;
}

if (REMOVE) {
  // ---- remove ONLY the demo rows (students by exact name in this academy, then now-unused demo batches) ----
  const demoNames = new Set(DEMO_STUDENTS.map((s) => s.name));
  const students = studentsTableExists ? (await loadDemoStudents()).filter((s) => demoNames.has(s.full_name)) : [];
  const removableBatches = DEMO_BATCHES.map((n) => batchByName.get(n.toLowerCase())).filter(Boolean);
  console.log(`Would remove: ${students.length} demo student(s) and up to ${removableBatches.length} demo batch(es) (only batches left with no students).`);
  if (!CONFIRM) {
    console.log("Nothing deleted. Re-run with --remove --confirm to delete exactly that.");
    process.exit(0);
  }
  if (students.length > 0) {
    const { error } = await sb.from("academy_students").delete().in("id", students.map((s) => s.id));
    if (error) fail(`Delete students failed: ${error.message}`);
  }
  let removedBatches = 0;
  for (const b of removableBatches) {
    if (studentsTableExists) {
      const { count } = await sb.from("academy_students").select("id", { count: "exact" }).eq("batch_id", b.id).limit(1);
      if (count && count > 0) {
        console.log(`Kept ${b.name}: still has ${count} non-demo student(s).`);
        continue;
      }
    }
    const { error } = await sb.from("batches").delete().eq("id", b.id).eq("academy_id", academyId);
    if (error) fail(`Delete batch ${b.name} failed: ${error.message}`);
    removedBatches++;
  }
  console.log(`Removed ${students.length} student(s) and ${removedBatches} batch(es).`);
  process.exit(0);
}

// ---- seed batches (only the ones that are missing) ----
let batchesAdded = 0;
for (const name of DEMO_BATCHES) {
  if (batchByName.has(name.toLowerCase())) continue;
  if (DRY) {
    console.log(`  would add batch: ${name}`);
    batchesAdded++;
    continue;
  }
  const { data, error } = await sb.from("batches").insert({ academy_id: academyId, name, status: "active" }).select("id, name, status").single();
  if (error) fail(`Insert batch "${name}" failed: ${error.message}`);
  batchByName.set(name.toLowerCase(), data);
  batchesAdded++;
}
console.log(`Batches: ${batchesAdded} added, ${DEMO_BATCHES.length - batchesAdded} already present.`);

// ---- seed students (only the ones that are missing, matched by name within this academy) ----
if (!studentsTableExists) {
  console.log("Students: SKIPPED. public.academy_students does not exist yet.");
  console.log("  Apply supabase/migrations/0004_academy_students.sql in the Supabase SQL Editor, then run this script again.");
  process.exit(0);
}

const existing = await loadDemoStudents();
const existingNames = new Set(existing.map((s) => s.full_name));
let studentsAdded = 0;
for (const s of DEMO_STUDENTS) {
  if (existingNames.has(s.name)) continue;
  const batch = batchByName.get(s.batch.toLowerCase());
  if (!batch && !DRY) fail(`Batch "${s.batch}" is missing, cannot place ${s.name}.`);
  if (DRY) {
    console.log(`  would add student: ${s.name} -> ${s.batch} (${s.status})`);
    studentsAdded++;
    continue;
  }
  const { error } = await sb.from("academy_students").insert({ academy_id: academyId, full_name: s.name, batch_id: batch.id, status: s.status });
  if (error) fail(`Insert student "${s.name}" failed: ${error.message}`);
  studentsAdded++;
}
console.log(`Students: ${studentsAdded} added, ${DEMO_STUDENTS.length - studentsAdded} already present.`);
console.log(DRY ? "Dry run complete. Nothing was written." : "Done.");
