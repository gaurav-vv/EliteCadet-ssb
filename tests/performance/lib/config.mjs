// Run configuration and the safety guard. A target must always be named; nothing
// defaults to a live site, and production is limited to a low-rate smoke profile
// unless a person raises it on purpose, one flag at a time.

export const TARGETS = ["local", "staging", "production"];

const PRODUCTION_LIMITS = { maxUsers: 1, maxRps: 1, maxDurationMs: 60_000 };
const DEFAULT_LIMITS = { maxUsers: 50, maxRps: 200, maxDurationMs: 10 * 60_000 };

function int(value, fallback) {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

// Throws with a plain message when the run is unsafe or under-specified.
export function resolveConfig(args, env = process.env) {
  const target = args.env ?? env.PERF_TARGET;
  if (!TARGETS.includes(target)) {
    throw new Error(`Choose a target explicitly: --env ${TARGETS.join("|")} (or PERF_TARGET). Nothing defaults to a live site.`);
  }
  const rawBase = args.base ?? env.PERF_BASE_URL;
  if (!rawBase || typeof rawBase !== "string") throw new Error("Give the site to test: --base https://host (or PERF_BASE_URL).");
  let base;
  try {
    base = new URL(rawBase);
  } catch {
    throw new Error("--base is not a valid URL.");
  }
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (target === "local" && !isLoopback) throw new Error("--env local only allows localhost. Use --env staging or production for a remote host.");
  if (target !== "local" && isLoopback) throw new Error(`--env ${target} needs a remote URL, not localhost.`);

  const levels = String(args.levels ?? "1").split(",").map((v) => int(v, NaN)).filter((n) => Number.isFinite(n) && n > 0);
  if (levels.length === 0) throw new Error("--levels must be a comma-separated list of positive user counts, e.g. 1,5,10.");

  const limits = target === "production" ? { ...PRODUCTION_LIMITS } : { ...DEFAULT_LIMITS };
  const cfg = {
    target,
    baseUrl: base.origin,
    levels,
    durationMs: int(args.duration, 30) * 1000,
    rampMs: int(args.ramp, 5) * 1000,
    thinkMs: int(args["think-ms"], 500),
    requestTimeoutMs: int(args.timeout, 15) * 1000,
    maxRps: int(args["max-rps"], target === "production" ? 1 : 50),
    // Abort a level when the error rate or p95 crosses these.
    maxErrorRate: Number(args["max-error-rate"] ?? 0.05),
    maxP95Ms: int(args["max-p95-ms"], 5000),
    limits,
  };
  if (target === "production") {
    // Production: smoke only. Raising these is a deliberate, reviewed act, never a default.
    if (env.PERF_ALLOW_PRODUCTION !== "smoke") {
      throw new Error("Production runs need PERF_ALLOW_PRODUCTION=smoke, set by a person who has approved a low-rate smoke test.");
    }
    if (args["raise-production-limits"] === true && env.PERF_PRODUCTION_APPROVED_BY) {
      limits.maxUsers = int(args["max-users"], PRODUCTION_LIMITS.maxUsers);
      limits.maxDurationMs = int(args["max-duration"], 60) * 1000;
    }
  }
  const top = Math.max(...cfg.levels);
  if (top > limits.maxUsers) throw new Error(`--levels asks for ${top} users; the limit for --env ${target} is ${limits.maxUsers}.`);
  if (cfg.durationMs > limits.maxDurationMs) throw new Error(`--duration exceeds the ${limits.maxDurationMs / 1000}s limit for --env ${target}.`);
  if (cfg.maxRps > limits.maxRps) throw new Error(`--max-rps exceeds the ${limits.maxRps} requests/second limit for --env ${target}.`);
  return cfg;
}
