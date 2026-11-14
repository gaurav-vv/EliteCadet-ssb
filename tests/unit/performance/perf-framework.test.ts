// @vitest-environment node
import { describe, expect, it } from "vitest";
import { percentile, summarize } from "../../performance/lib/stats.mjs";
import { parseArgs, resolveConfig } from "../../performance/lib/config.mjs";
import { shouldAbort, createRateLimiter } from "../../performance/lib/runner.mjs";
import { sanitize, renderMarkdown } from "../../performance/lib/report.mjs";

describe("stats", () => {
  it("uses nearest-rank percentiles that are always observed values", () => {
    const xs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(xs, 50)).toBe(50);
    expect(percentile(xs, 90)).toBe(90);
    expect(percentile(xs, 99)).toBe(100);
    expect(percentile([], 50)).toBeNull();
  });

  it("summarises unsorted samples and marks p99 unreliable under 100 samples", () => {
    const s = summarize([30, 10, 20], { errors: 1, timeouts: 0 });
    expect(s).toMatchObject({ samples: 3, min: 10, p50: 20, max: 30, errors: 1, p99Reliable: false });
    expect(summarize(Array.from({ length: 100 }, (_, i) => i + 1)).p99Reliable).toBe(true);
  });
});

describe("config safety guard", () => {
  const ok = (extra: string[] = []) => parseArgs(["--env", "local", "--base", "http://127.0.0.1:3100", ...extra]);

  it("requires an explicit target and a URL: nothing defaults to a live site", () => {
    expect(() => resolveConfig(parseArgs([]), {} as NodeJS.ProcessEnv)).toThrow(/target explicitly/);
    expect(() => resolveConfig(parseArgs(["--env", "local"]), {} as NodeJS.ProcessEnv)).toThrow(/site to test/);
  });

  it("keeps local runs on localhost and remote runs off it", () => {
    expect(() => resolveConfig(parseArgs(["--env", "local", "--base", "https://example.com"]), {} as NodeJS.ProcessEnv)).toThrow(/only allows localhost/);
    expect(() => resolveConfig(parseArgs(["--env", "staging", "--base", "http://127.0.0.1:3000"]), {} as NodeJS.ProcessEnv)).toThrow(/remote URL/);
  });

  it("accepts a conservative local run", () => {
    expect(resolveConfig(ok(["--levels", "1,5,10"]), {} as NodeJS.ProcessEnv).levels).toEqual([1, 5, 10]);
  });

  it("refuses production unless a person has opted in to a smoke run", () => {
    const args = parseArgs(["--env", "production", "--base", "https://example.vercel.app"]);
    expect(() => resolveConfig(args, {} as NodeJS.ProcessEnv)).toThrow(/PERF_ALLOW_PRODUCTION=smoke/);
    expect(resolveConfig(args, { PERF_ALLOW_PRODUCTION: "smoke" } as unknown as NodeJS.ProcessEnv).limits.maxUsers).toBe(1);
  });

  it("caps production at one user, low rate and a short run, even if asked for more", () => {
    const env = { PERF_ALLOW_PRODUCTION: "smoke" } as unknown as NodeJS.ProcessEnv;
    const base = ["--env", "production", "--base", "https://example.vercel.app"];
    expect(() => resolveConfig(parseArgs([...base, "--levels", "25"]), env)).toThrow(/limit for --env production is 1/);
    expect(() => resolveConfig(parseArgs([...base, "--max-rps", "20"]), env)).toThrow(/requests\/second limit/);
    expect(() => resolveConfig(parseArgs([...base, "--duration", "600"]), env)).toThrow(/limit for --env production/);
  });

  it("does not let a flag alone raise production limits (needs a named approver too)", () => {
    const args = parseArgs(["--env", "production", "--base", "https://example.vercel.app", "--levels", "5", "--raise-production-limits", "--max-users", "5"]);
    expect(() => resolveConfig(args, { PERF_ALLOW_PRODUCTION: "smoke" } as unknown as NodeJS.ProcessEnv)).toThrow(/limit for --env production is 1/);
  });
});

describe("runner safety", () => {
  const rec = (ms: number, ok = true) => ({ ms, ok });
  it("does not judge a level on too few samples", () => {
    expect(shouldAbort(Array.from({ length: 5 }, () => rec(9999, false)), { maxErrorRate: 0.05, maxP95Ms: 100 })).toBeNull();
  });
  it("aborts on a high error rate", () => {
    const recent = [...Array.from({ length: 15 }, () => rec(50)), ...Array.from({ length: 10 }, () => rec(50, false))];
    expect(shouldAbort(recent, { maxErrorRate: 0.05, maxP95Ms: 5000 })).toMatch(/error rate/);
  });
  it("aborts on a slow p95", () => {
    expect(shouldAbort(Array.from({ length: 30 }, () => rec(900)), { maxErrorRate: 0.5, maxP95Ms: 500 })).toMatch(/p95/);
  });
  it("lets a healthy level continue", () => {
    expect(shouldAbort(Array.from({ length: 30 }, () => rec(80)), { maxErrorRate: 0.05, maxP95Ms: 500 })).toBeNull();
  });
  it("spaces request starts to the configured rate", async () => {
    const acquire = createRateLimiter(50); // 20 ms apart
    const t = performance.now();
    await Promise.all([acquire(), acquire(), acquire(), acquire()]);
    expect(performance.now() - t).toBeGreaterThanOrEqual(55);
  });
});

describe("report sanitising", () => {
  it("removes JWTs, Supabase keys, bearer tokens, session cookies and passwords", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijk";
    const text = sanitize(`token ${jwt} key sb_secret_abc123 Authorization: Bearer abc.def.ghi cookie sb-ref-auth-token=base64-AAAA; password=hunter2 "access_token":"zzz"`);
    expect(text).not.toMatch(/eyJhbGci|sb_secret_abc123|abc\.def\.ghi|base64-AAAA|hunter2|zzz/);
  });

  it("renders a report without leaking and flags an unreliable p99", () => {
    const md = renderMarkdown({
      scenario: "public", startedAt: "2026-10-29T00:00:00.000Z", node: "v26", client: "test",
      config: { target: "local", baseUrl: "http://127.0.0.1:3100", levels: [1], durationMs: 1000, rampMs: 0, thinkMs: 0, maxRps: 5 },
      levels: [{ users: 1, requests: 3, rps: 3, aborted: false, stopReason: null, bytes: 10, statuses: { 200: 3 }, overall: { p50: 1, p90: 2, p95: 2, p99: 3, p99Reliable: false, errors: 0, timeouts: 0 }, byRequest: {} }],
      checks: [{ name: "ok", pass: true, detail: "fine" }], notes: [],
    });
    expect(md).toContain("| 1 | 3 | 3 | 1 | 2 | 2 | 3* | 0 | 0 | no |");
  });
});
