import { ROUTES } from "./inventory.mjs";

// Scenario B: public pages. Each iteration requests every public page once and then
// the landing page again, so a second request shows whatever caching exists. Nothing
// is submitted. Needs no accounts and makes no database calls.
export const name = "public";
export const description = "Public pages and repeat-request caching (no accounts needed)";

export async function journey({ request }) {
  for (const path of ROUTES.public) await request(`GET ${path}`, path);
  await request("GET / (repeat)", "/");
}

export function checks(level) {
  const bad = Object.entries(level.statuses).filter(([s]) => Number(s) >= 400 || Number(s) === 0);
  return [{ name: `public pages answer 2xx/3xx (${level.users} users)`, pass: bad.length === 0, detail: bad.length ? `unexpected statuses ${JSON.stringify(Object.fromEntries(bad))}` : "all 2xx/3xx" }];
}
