import { summarize, summarizeByName, percentile } from "./stats.mjs";
import { timedRequest } from "./http.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A global start-time limiter: no more than `maxRps` requests begin per second,
// whatever the number of virtual users.
export function createRateLimiter(maxRps, now = () => performance.now()) {
  const interval = 1000 / maxRps;
  let next = 0;
  return async function acquire() {
    const t = now();
    const slot = Math.max(t, next);
    next = slot + interval;
    if (slot > t) await sleep(slot - t);
  };
}

// Decides whether a level must stop, from the most recent requests.
export function shouldAbort(recent, { maxErrorRate, maxP95Ms }, minSamples = 20) {
  if (recent.length < minSamples) return null;
  const errors = recent.filter((r) => !r.ok).length;
  if (errors / recent.length > maxErrorRate) return `error rate ${(100 * errors / recent.length).toFixed(1)}% over the ${(100 * maxErrorRate).toFixed(1)}% limit`;
  const sorted = recent.map((r) => r.ms).sort((a, b) => a - b);
  const p95 = percentile(sorted, 95);
  if (p95 > maxP95Ms) return `p95 ${Math.round(p95)} ms over the ${maxP95Ms} ms limit`;
  return null;
}

// Runs `journey` in a loop for each virtual user. Users start spread across `rampMs`.
// Never retries a failed request: a struggling system must not receive more traffic.
// A 429 stops the level at once and reports its Retry-After.
export async function runLevel(config, users, journey, makeUserContext = async () => ({})) {
  const records = [];
  const acquire = createRateLimiter(config.maxRps);
  const state = { abort: false, reason: null };
  const started = performance.now();
  const endAt = started + config.durationMs;

  const request = async (name, path, options = {}) => {
    if (state.abort) return null;
    await acquire();
    const result = await timedRequest(name, new URL(path, config.baseUrl).href, { timeoutMs: config.requestTimeoutMs, ...options });
    const record = { ...result };
    delete record.text; // the body is measured, never kept
    records.push({ ...record, at: performance.now() - started });
    if (result.status === 429) {
      state.abort = true;
      state.reason = `HTTP 429 received${result.retryAfter ? ` (Retry-After ${result.retryAfter}s)` : ""}`;
    }
    return result;
  };

  const monitor = setInterval(() => {
    if (state.abort) return;
    const reason = shouldAbort(records.slice(-100), config);
    if (reason) {
      state.abort = true;
      state.reason = reason;
    }
  }, 1000);

  const vu = async (index) => {
    await sleep((config.rampMs * index) / users);
    const ctx = await makeUserContext(index);
    while (!state.abort && performance.now() < endAt) {
      await journey({ request, ctx, index });
      if (config.thinkMs) await sleep(config.thinkMs);
    }
  };

  await Promise.all(Array.from({ length: users }, (_, i) => vu(i)));
  clearInterval(monitor);
  const elapsedMs = performance.now() - started;
  const errors = records.filter((r) => !r.ok).length;
  const timeouts = records.filter((r) => r.timedOut).length;
  return {
    users,
    requests: records.length,
    elapsedMs: Math.round(elapsedMs),
    rps: Math.round((records.length / (elapsedMs / 1000)) * 10) / 10,
    bytes: records.reduce((s, r) => s + r.bytes, 0),
    aborted: state.abort,
    stopReason: state.reason,
    overall: summarize(records.map((r) => r.ms), { errors, timeouts }),
    ttfb: summarize(records.filter((r) => r.ttfbMs !== null).map((r) => r.ttfbMs)),
    byRequest: summarizeByName(records),
    statuses: records.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {}),
  };
}
