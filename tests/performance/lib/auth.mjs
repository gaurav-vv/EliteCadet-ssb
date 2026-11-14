import { createServerClient } from "@supabase/ssr";

// Test-account sign-in for authenticated scenarios. Credentials come ONLY from
// environment variables (see tests/performance/README.md) and are never printed or
// written to a report. The Supabase SDK itself builds the session cookie, so the
// cookie format is exactly what the app expects. Only the PUBLIC anon/publishable
// key is used here; never a service-role key.

export const ROLES = {
  student: { env: "STUDENT", home: "/student" },
  mentor: { env: "MENTOR", home: "/mentor" },
  academy_admin: { env: "ACADEMY", home: "/academy" },
  super_admin: { env: "ADMIN", home: "/admin" },
};

export function credentialsFor(role, env = process.env) {
  const key = ROLES[role]?.env;
  const email = env[`PERF_${key}_EMAIL`];
  const password = env[`PERF_${key}_PASSWORD`];
  return email && password ? { email, password } : null;
}

export function supabaseEnv(env = process.env) {
  const url = env.PERF_SUPABASE_URL;
  const anonKey = env.PERF_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

// Signs in once. Returns the Cookie header for the app plus the sign-in duration.
export async function signIn(role, env = process.env) {
  const creds = credentialsFor(role, env);
  const sb = supabaseEnv(env);
  if (!creds || !sb) return null;
  const jar = new Map();
  const client = createServerClient(sb.url, sb.anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const started = performance.now();
  const { data, error } = await client.auth.signInWithPassword(creds);
  const loginMs = performance.now() - started;
  if (error || !data.session) return { role, ok: false, loginMs, status: error?.status ?? 0 };
  return {
    role,
    ok: true,
    loginMs,
    cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; "),
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    userId: data.user.id,
  };
}
