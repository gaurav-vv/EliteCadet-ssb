import { ROLES, credentialsFor, supabaseEnv } from "../lib/auth.mjs";
import { summarize } from "../lib/stats.mjs";

// Application-visible latency of each Supabase operation the app depends on, measured
// one operation at a time from this machine. These are HTTP round trips to Supabase,
// NOT PostgreSQL execution time (that needs a database connection and EXPLAIN).
// Uses only the PUBLIC anon/publishable key plus a test account's own session.
// Read-only apart from sign-in, one token refresh chain and one sign-out of a session
// created for this run.
export const name = "supabase-latency";
export const description = "Per-operation Supabase round-trip latency: Auth, JWKS, REST profile reads, refresh, sign-out";

const ACCOUNT_ACCESS_SELECT = "role,status,academy:academies!profiles_academy_id_fkey(status)";

async function timed(fn) {
  const t = performance.now();
  try {
    const res = await fn();
    return { ms: performance.now() - t, ok: res.status < 400, status: res.status, body: res };
  } catch {
    return { ms: performance.now() - t, ok: false, status: 0, body: null };
  }
}

export async function run({ env = process.env, samples = 15, timeoutMs = 15000 } = {}) {
  const sb = supabaseEnv(env);
  if (!sb) return { skipped: "PERF_SUPABASE_URL and PERF_SUPABASE_ANON_KEY are not set", operations: {} };
  const base = sb.url.replace(/\/+$/, "");
  const anon = { apikey: sb.anonKey };
  const get = (url, headers = {}) => fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) }).then(async (r) => (await r.arrayBuffer(), r));
  const ops = {};
  const record = (opName, results) => {
    ops[opName] = summarize(results.map((r) => r.ms), { errors: results.filter((r) => !r.ok).length });
  };
  const repeat = async (fn) => {
    await fn(); // first call is excluded: connection set-up is not what a warm app pays
    const out = [];
    for (let i = 0; i < samples; i++) out.push(await timed(fn));
    return out;
  };

  record("auth health (no session)", await repeat(() => get(`${base}/auth/v1/health`, anon)));
  record("JWKS fetch (signing keys)", await repeat(() => get(`${base}/auth/v1/.well-known/jwks.json`)));
  record("REST read, anon, profiles limit 1 (RLS applies)", await repeat(() => get(`${base}/rest/v1/profiles?select=id&limit=1`, anon)));

  const roles = Object.keys(ROLES).filter((r) => credentialsFor(r, env));
  if (roles.length === 0) return { operations: ops, notes: ["No PERF_<ROLE>_EMAIL/_PASSWORD test account set: signed-in operations not measured."] };

  const role = roles[0];
  const creds = credentialsFor(role, env);
  const signInOnce = () =>
    timed(() => fetch(`${base}/auth/v1/token?grant_type=password`, { method: "POST", headers: { ...anon, "content-type": "application/json" }, body: JSON.stringify(creds), signal: AbortSignal.timeout(timeoutMs) }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) })));
  const login = await signInOnce();
  const session = login.body?.json;
  ops[`sign-in (${role}, 1 sample)`] = summarize([login.ms], { errors: login.ok ? 0 : 1 });
  if (!login.ok || !session?.access_token) return { operations: ops, notes: [`Sign-in failed for the ${role} test account (status ${login.status}); signed-in operations not measured.`] };

  const authed = { ...anon, authorization: `Bearer ${session.access_token}` };
  const userId = session.user?.id;
  record("Auth getUser() round trip (what getClaims() avoids)", await repeat(() => get(`${base}/auth/v1/user`, authed)));
  record("REST profile read, own row (proxy role/status/academy lookup)", await repeat(() => get(`${base}/rest/v1/profiles?select=${encodeURIComponent(ACCOUNT_ACCESS_SELECT)}&id=eq.${userId}`, authed)));
  record("REST profile read, own row (session helper columns)", await repeat(() => get(`${base}/rest/v1/profiles?select=id,role,full_name,academy_id,status&id=eq.${userId}`, authed)));
  record("REST unread notification count (head, exact)", await repeat(() => fetch(`${base}/rest/v1/notifications?select=id&recipient_id=eq.${userId}&read_at=is.null`, { method: "HEAD", headers: { ...authed, prefer: "count=exact" }, signal: AbortSignal.timeout(timeoutMs) })));

  // Token refresh rotates the refresh token, so each call uses the newest one. Few samples on purpose.
  let refreshToken = session.refresh_token;
  const refreshes = [];
  for (let i = 0; i < 3; i++) {
    const r = await timed(() => fetch(`${base}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { ...anon, "content-type": "application/json" }, body: JSON.stringify({ refresh_token: refreshToken }), signal: AbortSignal.timeout(timeoutMs) }).then(async (res) => ({ status: res.status, json: await res.json().catch(() => null) })));
    refreshes.push(r);
    refreshToken = r.body?.json?.refresh_token ?? refreshToken;
  }
  record("token refresh (3 samples)", refreshes);

  // Sign-out ends this run's own session only (scope local).
  const logoutAuth = { ...anon, authorization: `Bearer ${refreshes.at(-1)?.body?.json?.access_token ?? session.access_token}` };
  const out = await timed(() => fetch(`${base}/auth/v1/logout?scope=local`, { method: "POST", headers: logoutAuth, signal: AbortSignal.timeout(timeoutMs) }));
  ops["sign-out (1 sample)"] = summarize([out.ms], { errors: out.ok ? 0 : 1 });
  return { operations: ops, notes: [`Signed-in operations measured with the ${role} test account. Latencies are HTTP round trips from this machine, not database execution time.`] };
}
