import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// Reports must never carry secrets. Anything that looks like a JWT, a Supabase
// key, a bearer token, or a session cookie value is replaced before writing.
const PATTERNS = [
  [/eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*/g, "<jwt>"],
  [/sb_(?:publishable|secret)_[\w-]+/g, "<supabase-key>"],
  [/Bearer\s+[\w.~+/=-]+/gi, "Bearer <token>"],
  [/(sb-[\w-]*auth-token[\w.-]*=)[^;\s]+/gi, "$1<cookie>"],
  [/(access_token|refresh_token|password|apikey)(["'=:\s]+)[^"'\s,&}]+/gi, "$1$2<redacted>"],
];

export function sanitize(text) {
  return PATTERNS.reduce((out, [re, to]) => out.replace(re, to), String(text));
}

const fmt = (n) => (n === null || n === undefined ? "n/a" : String(n));

export function renderMarkdown(run) {
  const lines = [];
  lines.push(`# Performance run: ${run.scenario}`, "");
  lines.push(`- Target: **${run.config.target}** (${run.config.baseUrl})`);
  lines.push(`- When: ${run.startedAt}`);
  lines.push(`- Levels: ${run.config.levels.join(", ")} users, ${run.config.durationMs / 1000}s each, ramp ${run.config.rampMs / 1000}s, think ${run.config.thinkMs} ms, max ${run.config.maxRps} req/s`);
  lines.push(`- Client: Node ${run.node}, one machine (${run.client}). This is lab data from one location, not field data.`, "");
  lines.push("| Users | Requests | req/s | p50 ms | p90 ms | p95 ms | p99 ms | Errors | Timeouts | Stopped |", "|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const l of run.levels) {
    const o = l.overall;
    lines.push(`| ${l.users} | ${l.requests} | ${l.rps} | ${fmt(o.p50)} | ${fmt(o.p90)} | ${fmt(o.p95)} | ${fmt(o.p99)}${o.p99Reliable ? "" : "*"} | ${o.errors} | ${o.timeouts} | ${l.aborted ? l.stopReason : "no"} |`);
  }
  lines.push("", "\* p99 from fewer than 100 samples is effectively the maximum.", "");
  for (const l of run.levels) {
    lines.push(`## ${l.users} user(s): by request`, "", "| Request | Samples | p50 ms | p95 ms | max ms | Errors |", "|---|---:|---:|---:|---:|---:|");
    for (const [name, s] of Object.entries(l.byRequest)) lines.push(`| ${name} | ${s.samples} | ${fmt(s.p50)} | ${fmt(s.p95)} | ${fmt(s.max)} | ${s.errors} |`);
    lines.push("", `Statuses: ${JSON.stringify(l.statuses)}; bytes transferred: ${l.bytes}`, "");
  }
  if (run.operations && Object.keys(run.operations).length) {
    lines.push("## Supabase operations (HTTP round trips from this machine, not PostgreSQL execution time)", "", "| Operation | Samples | min ms | p50 ms | p95 ms | max ms | Errors |", "|---|---:|---:|---:|---:|---:|---:|");
    for (const [op, s] of Object.entries(run.operations)) lines.push(`| ${op} | ${s.samples} | ${fmt(s.min)} | ${fmt(s.p50)} | ${fmt(s.p95)} | ${fmt(s.max)} | ${s.errors} |`);
    lines.push("");
  }
  if (run.checks?.length) {
    lines.push("## Checks", "", "| Check | Result | Detail |", "|---|---|---|");
    for (const c of run.checks) lines.push(`| ${c.name} | ${c.pass ? "pass" : "FAIL"} | ${c.detail ?? ""} |`);
    lines.push("");
  }
  if (run.notes?.length) lines.push("## Notes", "", ...run.notes.map((n) => `- ${n}`), "");
  return sanitize(lines.join("\n"));
}

export function writeReport(run, dir) {
  mkdirSync(dir, { recursive: true });
  const stamp = run.startedAt.replace(/[:.]/g, "-");
  const base = path.join(dir, `${run.scenario}-${run.config.target}-${stamp}`);
  writeFileSync(`${base}.json`, sanitize(JSON.stringify(run, null, 2)));
  writeFileSync(`${base}.md`, renderMarkdown(run));
  return base;
}
