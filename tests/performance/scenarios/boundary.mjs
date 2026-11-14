// Authorization boundary without any account: every protected workspace must send an
// anonymous visitor (and a visitor with a garbage session cookie) to /login. This
// exercises the proxy only; it makes no database call because there is no session.
export const name = "boundary";
export const description = "Anonymous and invalid-session access to protected routes (no accounts needed)";

const PROTECTED = ["/student", "/mentor", "/academy", "/admin"];
const results = [];

export async function journey({ request }) {
  for (const path of PROTECTED) {
    const anon = await request(`anonymous ${path}`, path);
    if (anon) results.push({ path, status: anon.status, location: anon.location });
    const bad = await request(`invalid-session ${path}`, path, { headers: { cookie: "sb-perf-auth-token=not-a-real-session" } });
    if (bad) results.push({ path, status: bad.status, location: bad.location });
  }
}

export function checks() {
  const toLogin = (r) => r.status >= 300 && r.status < 400 && r.location && new URL(r.location, "http://x").pathname === "/login";
  const wrong = results.filter((r) => !toLogin(r));
  const total = results.length;
  results.length = 0;
  return [{ name: "protected routes redirect anonymous and invalid sessions to /login", pass: wrong.length === 0 && total > 0, detail: wrong.length ? `${wrong.length} of ${total} did not redirect to /login, e.g. ${wrong[0].path} -> ${wrong[0].status}` : `${total} of ${total} redirected` }];
}
