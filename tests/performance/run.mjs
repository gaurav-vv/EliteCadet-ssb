#!/usr/bin/env node
// EliteCadet performance runner. Zero dependencies beyond what the app already has.
//
//   node tests/performance/run.mjs --scenario public --env local --base http://127.0.0.1:3100 --levels 1,5,10
//
// See tests/performance/README.md. A target (--env) and a URL (--base) are always
// required; production is limited to a low-rate smoke profile by lib/config.mjs.
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, resolveConfig } from "./lib/config.mjs";
import { runLevel } from "./lib/runner.mjs";
import { writeReport, sanitize } from "./lib/report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

// Optional ignored file with PERF_* variables (never committed: .gitignore has .env*).
function loadEnvFile() {
  const file = path.join(here, ".env.perf");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SCENARIOS = {
  public: () => import("./scenarios/public.mjs"),
  boundary: () => import("./scenarios/boundary.mjs"),
  authenticated: () => import("./scenarios/authenticated.mjs"),
  "supabase-latency": () => import("./scenarios/supabase-latency.mjs"),
};

function usage(message) {
  if (message) console.error(`\n${sanitize(message)}\n`);
  console.error(`Usage: node tests/performance/run.mjs --scenario <${Object.keys(SCENARIOS).join("|")}> --env <local|staging|production> --base <url> [--levels 1,5,10] [--duration 30] [--ramp 5] [--think-ms 500] [--max-rps 50] [--timeout 15] [--max-error-rate 0.05] [--max-p95-ms 5000]`);
  process.exit(2);
}

async function main() {
  loadEnvFile();
  const args = parseArgs(process.argv.slice(2));
  const scenarioName = args.scenario;
  if (!SCENARIOS[scenarioName]) usage(`Unknown or missing --scenario "${scenarioName ?? ""}".`);
  let config;
  try {
    config = resolveConfig(args);
  } catch (error) {
    usage(error.message);
  }
  const scenario = await SCENARIOS[scenarioName]();
  const run = { scenario: scenarioName, startedAt: new Date().toISOString(), config, node: process.version, client: `${os.platform()} ${os.arch()}`, levels: [], checks: [], notes: [] };

  if (scenarioName === "supabase-latency") {
    const result = await scenario.run({});
    if (result.skipped) {
      console.error(result.skipped);
      process.exit(3);
    }
    run.operations = result.operations;
    run.notes.push(...(result.notes ?? []));
    run.levels = [];
    const base = writeReport({ ...run, levels: [] }, path.join(here, "reports"));
    for (const [name, s] of Object.entries(result.operations)) console.log(`${name.padEnd(64)} n=${s.samples} p50=${s.p50}ms p95=${s.p95}ms max=${s.max}ms errors=${s.errors}`);
    console.log(`\nReport: ${path.relative(process.cwd(), base)}.{json,md}`);
    return;
  }

  if (scenarioName === "authenticated") {
    const roles = scenario.activeRoles();
    if (roles.length === 0) {
      console.error("No test accounts are configured, so authenticated journeys cannot run. Set PERF_SUPABASE_URL, PERF_SUPABASE_ANON_KEY and PERF_<STUDENT|MENTOR|ACADEMY|ADMIN>_EMAIL / _PASSWORD (see README).");
      process.exit(3);
    }
    run.notes.push(`Roles exercised: ${roles.join(", ")}. Each virtual user signs in once; sign-in time is reported by the supabase-latency scenario.`);
  }

  let failed = false;
  for (const users of config.levels) {
    console.log(`\n[${scenarioName}] ${config.target} ${config.baseUrl}: ${users} user(s) for ${config.durationMs / 1000}s (ramp ${config.rampMs / 1000}s, max ${config.maxRps} req/s)`);
    const level = await runLevel(config, users, scenario.journey, scenario.makeUserContext ? (i) => scenario.makeUserContext(i) : undefined);
    run.levels.push(level);
    const o = level.overall;
    console.log(`  requests=${level.requests} rps=${level.rps} p50=${o.p50}ms p95=${o.p95}ms p99=${o.p99}ms${o.p99Reliable ? "" : "*"} errors=${o.errors} timeouts=${o.timeouts}${level.aborted ? `  STOPPED: ${level.stopReason}` : ""}`);
    const results = scenario.checks ? scenario.checks(level) : [];
    run.checks.push(...results);
    if (level.aborted || results.some((c) => !c.pass)) failed = true;
    if (level.aborted) {
      run.notes.push(`Stopped at ${users} user(s): ${level.stopReason}. Higher levels were not run.`);
      break;
    }
  }
  const base = writeReport(run, path.join(here, "reports"));
  for (const c of run.checks) console.log(`  [${c.pass ? "pass" : "FAIL"}] ${c.name}: ${c.detail}`);
  console.log(`\nReport: ${path.relative(process.cwd(), base)}.{json,md}`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(sanitize(error?.stack ?? String(error)));
  process.exit(1);
});
