import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

// Signs in as each role through the dev preview and opens every static page
// of that role's workspace: no 5xx, no redirect away, no error state.
// Opt-in: needs `npm run dev:local` (local Supabase, dev preview on).
test.skip(!process.env.E2E_DEV_PREVIEW, "needs `npm run dev:local` — set E2E_DEV_PREVIEW=1");

function staticPages(prefix: string): string[] {
  const root = path.join(process.cwd(), "app", prefix);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (!statSync(full).isDirectory()) continue;
      if (name.startsWith("[")) continue;
      walk(full);
    }
    if (readdirSync(dir).includes("page.tsx")) out.push(`/${path.relative(path.join(process.cwd(), "app"), dir)}`);
  };
  walk(root);
  return out.sort();
}

const ROLES = [
  { role: "student", prefix: "student" },
  { role: "mentor", prefix: "mentor" },
  { role: "academy_admin", prefix: "academy" },
  { role: "super_admin", prefix: "admin" },
];

for (const { role, prefix } of ROLES) {
  test(`${role}: every /${prefix} page loads`, async ({ page }) => {
    test.setTimeout(10 * 60_000);
    await page.goto(`/dev-preview/${role}`);
    await expect(page).toHaveURL(new RegExp(`/${prefix}$`));

    const problems: string[] = [];
    for (const route of staticPages(prefix)) {
      const response = await page.goto(route);
      const status = response?.status() ?? 0;
      const url = new URL(page.url());
      if (status >= 500) problems.push(`${route}: HTTP ${status}`);
      else if (url.pathname !== route) problems.push(`${route}: redirected to ${url.pathname}${url.search}`);
      else if ((await page.getByText(/couldn.t load|something went wrong|application error|unhandled runtime error/i).count()) > 0) {
        const text = await page.getByText(/couldn.t load|something went wrong|application error|unhandled runtime error/i).first().innerText();
        problems.push(`${route}: "${text.trim().slice(0, 120)}"`);
      }
    }
    expect(problems).toEqual([]);
  });
}
