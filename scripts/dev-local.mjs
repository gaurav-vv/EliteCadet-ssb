#!/usr/bin/env node
// `npm run dev:local` — runs the app against a LOCAL Supabase stack (Docker,
// supabase/config.toml, every migration in supabase/migrations applied)
// instead of whatever .env.local points at. Values are passed as process env,
// which Next.js never overrides from .env files, so .env.local is untouched.
// Never prints keys. Emails (signup confirmation, password reset) land in the
// local Mailpit inbox instead of real mailboxes.
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";

const SUPABASE = ["-y", "supabase@2"];

function run(args, opts = {}) {
  return execFileSync("npx", [...SUPABASE, ...args], { encoding: "utf8", ...opts });
}

try {
  // Idempotent: starts the stack (first run downloads images) or no-ops.
  run(["start", "-x", "edge-runtime,logflare,vector,imgproxy,realtime,storage-api,supavisor"], { stdio: "inherit" });
} catch {
  console.error("\nCould not start local Supabase. Is Docker running? (docker info)");
  process.exit(1);
}

const status = run(["status", "-o", "env"], { stdio: ["ignore", "pipe", "pipe"] });
const vars = Object.fromEntries(
  status
    .split("\n")
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);

const url = vars.API_URL;
const anonKey = vars.ANON_KEY;
const serviceKey = vars.SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error("`supabase status` did not report API_URL / ANON_KEY / SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  console.error(`Refusing to run: ${url} is not a local Supabase stack.`);
  process.exit(1);
}

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  // Preview buttons on the landing page: local stack only, password derived
  // from this stack's own key (stable across runs, never committed).
  DEV_PREVIEW_ENABLED: "true",
  DEV_PREVIEW_PASSWORD: `local-${createHash("sha256").update(serviceKey).digest("hex").slice(0, 24)}`,
};

const port = process.env.PORT ?? "3000";
const mail = vars.INBUCKET_URL ?? vars.MAILPIT_URL ?? "http://127.0.0.1:54324";
console.log(`\nApp:    http://localhost:${port}   (local Supabase at ${url})`);
console.log(`Emails: ${mail}`);
console.log(`Studio: ${vars.STUDIO_URL ?? "http://127.0.0.1:54323"}\n`);

const child = spawn("npx", ["next", "dev", "-p", port], { env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
