#!/usr/bin/env node
// Verifies, against the LOCAL Supabase stack, what getClaims() does and does not
// protect, by trying it:
//   1. the signing algorithm the stack really issues (decides whether getClaims
//      verifies locally or falls back to a network call);
//   2. a normal session: getClaims and getUser both accept it;
//   3. after a server-side sign-out of ALL sessions: does getUser still accept? does
//      getClaims? (the revocation window);
//   4. a tampered token and a token signed by another key are rejected;
//   5. suspending an account takes effect on the very next profile lookup, with no
//      dependence on the token (the proxy and layout read profiles every request).
// It never prints tokens or passwords. Needs tests/performance/.env.perf (run
// seed-local.mjs first) and refuses anything that is not localhost.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, "..", ".env.perf");
if (!existsSync(envFile)) {
  console.error("Run tests/performance/scripts/seed-local.mjs first.");
  process.exit(1);
}
const env = Object.fromEntries(readFileSync(envFile, "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
if (!["127.0.0.1", "localhost"].includes(new URL(env.PERF_SUPABASE_URL).hostname)) {
  console.error("Refusing: not a local Supabase.");
  process.exit(1);
}
const status = spawnSync("npx", ["-y", "supabase@2", "status", "-o", "env"], { encoding: "utf8", shell: true, cwd: path.join(here, "..", "..", "..") });
const serviceKey = (status.stdout.match(/^SERVICE_ROLE_KEY="?(.*?)"?$/m) ?? [])[1];
if (!serviceKey) {
  console.error("Local stack is not running.");
  process.exit(1);
}

const url = env.PERF_SUPABASE_URL;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, opts);
const results = [];
const note = (name, value, detail = "") => {
  results.push({ name, value, detail });
  console.log(`${String(value).padEnd(10)} ${name}${detail ? `  (${detail})` : ""}`);
};
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const decode = (jwt) => JSON.parse(Buffer.from(jwt.split(".")[0], "base64url").toString());

async function newSession(email, password) {
  const c = createClient(url, env.PERF_SUPABASE_ANON_KEY, opts);
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed (${error.status})`);
  return { client: c, session: data.session };
}

async function main() {
  const email = env.PERF_STUDENT_EMAIL;
  const password = env.PERF_STUDENT_PASSWORD;

  // 1 + 2: algorithm and a normal session
  const a = await newSession(email, password);
  const alg = decode(a.session.access_token).alg;
  note("signing algorithm issued by this stack", alg, alg.startsWith("HS") ? "symmetric: getClaims falls back to a getUser() network call" : "asymmetric: getClaims verifies locally");
  const claims = await a.client.auth.getClaims();
  const user = await a.client.auth.getUser();
  note("valid session accepted by getClaims()", claims.data ? "accepted" : "REJECTED");
  note("valid session accepted by getUser()", user.data?.user ? "accepted" : "REJECTED");

  // 4: tampered / foreign-key tokens
  const [h, p, s] = a.session.access_token.split(".");
  const payload = JSON.parse(Buffer.from(p, "base64url").toString());
  const forged = `${h}.${b64({ ...payload, sub: "00000000-0000-4000-8000-000000000000" })}.${s}`;
  const c2 = createClient(url, env.PERF_SUPABASE_ANON_KEY, opts);
  const tampered = await c2.auth.getClaims(forged);
  note("token with altered payload rejected by getClaims()", tampered.error ? "rejected" : "ACCEPTED (BAD)", tampered.error?.message?.slice(0, 60));
  const wrongSig = await c2.auth.getClaims(`${h}.${p}.${s.slice(0, -4)}AAAA`);
  note("token with a corrupted signature rejected by getClaims()", wrongSig.error ? "rejected" : "ACCEPTED (BAD)", wrongSig.error?.message?.slice(0, 60));

  // 3: revocation window. Global sign-out of every session of this user.
  const b = await newSession(email, password);
  await admin.auth.admin.signOut(b.session.access_token, "global");
  const afterUser = await c2.auth.getUser(b.session.access_token);
  const afterClaims = await c2.auth.getClaims(b.session.access_token);
  note("after global sign-out: getUser() on the old token", afterUser.error ? "rejected" : "ACCEPTED", afterUser.error?.code ?? "");
  note("after global sign-out: getClaims() on the old token", afterClaims.error ? "rejected" : "ACCEPTED", alg.startsWith("HS") ? "falls back to getUser, so it sees revocation here" : "verified locally; revocation not visible until the token expires");

  // 3b: the user's OWN sign-out (what the Log out button does) and a token copied earlier
  const own = await newSession(email, password);
  const copied = own.session.access_token;
  await own.client.auth.signOut();
  const copiedUser = await c2.auth.getUser(copied);
  const copiedClaims = await c2.auth.getClaims(copied);
  note("after the user's own log out: getUser() on a token copied earlier", copiedUser.error ? "rejected" : "ACCEPTED", copiedUser.error?.code ?? "");
  note("after the user's own log out: getClaims() on a token copied earlier", copiedClaims.error ? "rejected" : "ACCEPTED", "verified locally; usable until the token expires");

  // 5: suspension is read from the database, not the token
  const sess = await newSession(email, password);
  const uid = sess.session.user.id;
  await admin.from("profiles").update({ status: "suspended" }).eq("id", uid);
  const claimsAfter = await sess.client.auth.getClaims();
  const profile = await sess.client.from("profiles").select("status").eq("id", uid).maybeSingle();
  note("suspended user: token still verifies (claims carry no status)", claimsAfter.data ? "yes" : "no");
  note("suspended user: next profile lookup shows the suspension", profile.data?.status === "suspended" ? "immediate" : `status=${profile.data?.status}`);
  await admin.from("profiles").update({ status: "active" }).eq("id", uid);
  const restored = await sess.client.from("profiles").select("status").eq("id", uid).maybeSingle();
  note("account restored for later runs", restored.data?.status === "active" ? "active" : "CHECK");

  const bad = results.filter((r) => /ACCEPTED \(BAD\)|REJECTED|CHECK/.test(String(r.value)));
  process.exit(bad.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
