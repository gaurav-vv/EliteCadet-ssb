import { HOME, ROUTES } from "./inventory.mjs";
import { ROLES, credentialsFor, signIn } from "../lib/auth.mjs";

// Signed-in journeys per role (scenarios C-F). Each virtual user signs in ONCE (the
// sign-in is recorded as its own measurement), then walks its workspace's pages: a
// realistic mix, not a password login per request. Also checks:
//  * authorization: a role's session is sent to /forbidden on another workspace;
//  * tenant isolation: PERF_FOREIGN_MARKERS are names that exist only in a SECOND
//    academy; no page seen by the first academy's student, mentor or academy admin
//    may contain one (the super admin sees every academy, so is exempt);
//  * peer isolation: PERF_PEER_MARKERS are other students of the same batch; a
//    student's pages must not show them.
//  Names of the viewer's own mentor, mentees or academy are legitimately visible,
//  so "another role's name" is deliberately NOT used as a leak signal.
export const name = "authenticated";
export const description = "Signed-in journeys for roles with PERF_* test accounts (read-only GETs)";

const state = { forbidden: [], leaks: [], logins: [], pages: [] };

export function activeRoles(env = process.env) {
  return Object.keys(ROLES).filter((r) => credentialsFor(r, env));
}

const list = (value) => (value ? value.split("|").filter(Boolean) : []);
const foreignMarkers = (env = process.env) => list(env.PERF_FOREIGN_MARKERS);
const peerMarkers = (env = process.env) => list(env.PERF_PEER_MARKERS);

// One sign-in per role per run, shared by that role's virtual users and by every
// level. Signing in for each virtual user would measure the Auth service's sign-in
// rate limit instead of the app, and would hammer it. Sessions are therefore shared:
// many concurrent requests carry the same session, as one user with several tabs would.
const sessions = new Map();

export async function makeUserContext(index, env = process.env) {
  const roles = activeRoles(env);
  if (roles.length === 0) throw new Error("No test accounts configured (PERF_<ROLE>_EMAIL / _PASSWORD).");
  const role = roles[index % roles.length];
  if (!sessions.has(role)) {
    sessions.set(
      role,
      signIn(role, env).then((session) => {
        state.logins.push({ role, ok: Boolean(session?.ok), ms: session?.loginMs ?? null });
        return session;
      }),
    );
  }
  const session = await sessions.get(role);
  if (!session?.ok) throw new Error(`Sign-in failed for the ${role} test account.`);
  return { role, cookie: session.cookie };
}

const redirectsTo = (res, path) => res.status >= 300 && res.status < 400 && res.location && new URL(res.location, "http://x").pathname === path;

export async function journey({ request, ctx }) {
  const foreign = ctx.role === "super_admin" ? [] : foreignMarkers();
  const peers = ctx.role === "student" ? peerMarkers() : [];
  const headers = { cookie: ctx.cookie };
  for (const path of ROUTES[ctx.role]) {
    const res = await request(`${ctx.role} ${path}`, path, { headers });
    if (!res) return;
    state.pages.push({ role: ctx.role, path, status: res.status });
    if (res.status === 200) {
      const html = res.text();
      for (const marker of foreign) if (html.includes(marker)) state.leaks.push({ viewer: ctx.role, path, kind: "other academy" });
      for (const marker of peers) if (html.includes(marker)) state.leaks.push({ viewer: ctx.role, path, kind: "peer student" });
    }
  }
  const other = Object.keys(HOME).find((r) => r !== ctx.role);
  const refused = await request(`${ctx.role} -> ${HOME[other]} (must be refused)`, HOME[other], { headers });
  if (refused && !redirectsTo(refused, "/forbidden")) state.forbidden.push({ role: ctx.role, target: HOME[other], status: refused.status });
}

export function checks() {
  const pagesBad = state.pages.filter((p) => p.status !== 200);
  const failedLogins = state.logins.filter((l) => !l.ok);
  const out = [
    { name: "test accounts sign in", pass: failedLogins.length === 0, detail: `${state.logins.length} sign-ins, ${failedLogins.length} failed` },
    { name: "every workspace page answers 200 for its own role", pass: pagesBad.length === 0, detail: pagesBad.length ? `${pagesBad.length} non-200, e.g. ${pagesBad[0].path} -> ${pagesBad[0].status}` : `${state.pages.length} pages` },
    { name: "a role is refused (/forbidden) on another workspace", pass: state.forbidden.length === 0, detail: state.forbidden.length ? `${state.forbidden.length} not refused` : "all refused" },
    { name: "no page shows another academy's people or a student's peers", pass: state.leaks.length === 0 && foreignMarkers().length > 0, detail: foreignMarkers().length === 0 ? "no PERF_FOREIGN_MARKERS configured: isolation NOT tested" : state.leaks.length ? `${state.leaks.length} leaks, e.g. ${state.leaks[0].viewer} ${state.leaks[0].path} (${state.leaks[0].kind})` : `no leaks across ${state.pages.length} pages` },
  ];
  Object.assign(state, { forbidden: [], leaks: [], logins: [], pages: [] });
  return out;
}
