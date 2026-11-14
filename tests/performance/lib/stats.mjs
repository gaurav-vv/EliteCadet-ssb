// Percentiles and summaries. Nearest-rank method, so every reported value is a
// latency that was actually observed. p99 is only reported once there are enough
// samples for it to mean something (`reliable`).

export function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return null;
  const rank = Math.max(1, Math.ceil((p / 100) * sortedAsc.length));
  return sortedAsc[Math.min(rank, sortedAsc.length) - 1];
}

const round = (n) => (n === null ? null : Math.round(n * 10) / 10);

// samples: durations in ms (successful or not, as given). errors/timeouts are counted by the caller.
export function summarize(samples, { errors = 0, timeouts = 0 } = {}) {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    samples: n,
    min: round(sorted[0] ?? null),
    p50: round(percentile(sorted, 50)),
    p75: round(percentile(sorted, 75)),
    p90: round(percentile(sorted, 90)),
    p95: round(percentile(sorted, 95)),
    // p99 from fewer than 100 samples is just the maximum; flag it instead of presenting it as a tail.
    p99: round(percentile(sorted, 99)),
    p99Reliable: n >= 100,
    max: round(sorted[n - 1] ?? null),
    errors,
    timeouts,
  };
}

// Groups { name, ms, ok, timedOut } records by name.
export function summarizeByName(records) {
  const groups = new Map();
  for (const r of records) {
    const g = groups.get(r.name) ?? { ms: [], errors: 0, timeouts: 0 };
    g.ms.push(r.ms);
    if (!r.ok) g.errors += 1;
    if (r.timedOut) g.timeouts += 1;
    groups.set(r.name, g);
  }
  return Object.fromEntries([...groups].map(([name, g]) => [name, summarize(g.ms, g)]));
}
