import { HOME, ROUTES } from "./inventory.mjs";
import { ROLES, credentialsFor, signIn } from "../lib/auth.mjs";

// Signed-in journeys per role (scenarios C-F). Each virtual user signs in ONCE (the
// sign-in is recorded as its own measurement), then walks its workspace's pages: a
// realistic mix, not a password login per request. Also checks:
//  * authorization: a role's session is sent to /forbidden on another workspace;
//  * isolation: with PERF_<ROLE>_NAME set for each account, a page must never show
//    another account's name.
export const name = "authenticated";
export const description = "Signed-in journeys for roles with PERF_* test accounts (read-only GETs)";

const state = { forbidden: [], leaks: [], logins: [], pages: [] };

export function activeRoles(env = process.env) {
  return Object.keys(ROLES).filter((r) => credentialsFor(r, env));
}

const markers = (env = process.env) =>
  Object.fromEntries(Object.entries(ROLES).map(([role, { env: k }]) => [role, env[`PERF_${k}_NAME`]]).filter(([, v]) => v));

export async function makeUserContext(index, env = process.env) {
  const roles = activeRoles(env);
  if (roles.length === 0) throw new Error("No test accounts configured (PERF_<ROLE>_EMAIL / _PASSWORD).");
  const role = roles[index % roles.length];
  const session = await signIn(role, env);
  state.logins.push({ role, ok: Boolean(session?.ok), ms: session?.loginMs ?? null });
  if (!session?.ok) throw new Error(`Sign-in failed for the ${role} test account.`);
  return { role, cookie: session.cookie };
}

const redirectsTo = (res, path) => res.status >= 300 && res.status < 400 && res.location && new URL(res.location, "http://x").pathname === path;

export async function journey({ request, ctx }) {
  const own = markers();
  const headers = { cookie: ctx.cookie };
  for (const path of ROUTES[ctx.role]) {
    const res = await request(`${ctx.role} ${path}`, path, { headers });
    if (!res) return;
    state.pages.push({ role: ctx.role, path, status: res.status });
    if (res.status === 200) {
      const html = res.text();
      for (const [role, marker] of Object.entries(own)) if (role !== ctx.role && html.includes(marker)) state.leaks.push({ viewer: ctx.role, path, leakedFrom: role });
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
    { name: "no page shows another account name (PERF_<ROLE>_NAME markers)", pass: state.leaks.length === 0, detail: Object.keys(markers()).length < 2 ? "needs 2+ markers to be meaningful" : state.leaks.length ? `${state.leaks.length} leaks` : "no leaks" },
  ];
  Object.assign(state, { forbidden: [], leaks: [], logins: [], pages: [] });
  return out;
}
