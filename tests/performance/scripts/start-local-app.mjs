#!/usr/bin/env node
// Builds (unless --skip-build) and serves the app as a PRODUCTION build against the
// LOCAL Supabase stack, on PORT (default 3100), for performance runs. Next inlines
// NEXT_PUBLIC_* values at build time, so the build must see the local URL and key.
// Values are passed as process env (never written to disk, never printed).
// Refuses anything that is not a localhost Supabase.
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const status = spawnSync("npx", ["-y", "supabase@2", "status", "-o", "env"], { encoding: "utf8", shell: true, cwd: root });
const vars = Object.fromEntries(
  (status.stdout ?? "")
    .split("\n")
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
if (!vars.API_URL || !vars.ANON_KEY || !vars.SERVICE_ROLE_KEY) {
  console.error("Local Supabase is not running (start Docker, then `npx supabase start`).");
  process.exit(1);
}
if (!["127.0.0.1", "localhost"].includes(new URL(vars.API_URL).hostname)) {
  console.error("Refusing: that Supabase is not local.");
  process.exit(1);
}

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: vars.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: vars.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: vars.SERVICE_ROLE_KEY,
  DEV_PREVIEW_ENABLED: "false",
  NEXT_TELEMETRY_DISABLED: "1",
};
const port = process.env.PORT ?? "3100";

if (!process.argv.includes("--skip-build")) {
  console.log("Building production bundle against the local Supabase...");
  const build = spawnSync("npx", ["next", "build"], { stdio: "inherit", shell: true, cwd: root, env });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
console.log(`Serving on http://127.0.0.1:${port} (local Supabase). Ctrl+C to stop.`);
spawn("npx", ["next", "start", "-p", port], { stdio: "inherit", shell: true, cwd: root, env });
