// TEMPORARY audit (not committed): every static page per role, desktop + mobile.
import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";

const OUT = process.env.AUDIT_OUT!;
function staticPages(prefix: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory() && !name.startsWith("[")) walk(full);
    }
    if (readdirSync(dir).includes("page.tsx")) out.push(`/${path.relative(path.join(process.cwd(), "app"), dir)}`);
  };
  walk(path.join(process.cwd(), "app", prefix));
  return out.sort();
}
const ROLES = [
  { role: "student", prefix: "student" },
  { role: "mentor", prefix: "mentor" },
  { role: "academy_admin", prefix: "academy" },
  { role: "super_admin", prefix: "admin" },
];
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 860 },
  { name: "mobile", width: 375, height: 780 },
];

for (const { role, prefix } of ROLES) {
  for (const vp of VIEWPORTS) {
    test(`${role} ${vp.name}`, async ({ page }) => {
      test.setTimeout(20 * 60_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const findings: Record<string, string[]> = {};
      let current = "";
      const add = (msg: string) => ((findings[current] ??= []).push(msg));
      page.on("console", (m) => { if (m.type() === "error") add(`console: ${m.text().slice(0, 200)}`); });
      page.on("pageerror", (e) => add(`pageerror: ${e.message.slice(0, 200)}`));
      page.on("response", (r) => { if (r.status() >= 500) add(`HTTP ${r.status()} ${new URL(r.url()).pathname}`); });

      current = "login";
      await page.goto(`/dev-preview/${role}`);
      await page.waitForURL(new RegExp(`/${prefix}$`), { timeout: 60_000 });
      const dir = path.join(OUT, `${prefix}-${vp.name}`);
      mkdirSync(dir, { recursive: true });

      for (const route of staticPages(prefix)) {
        current = route;
        const t0 = Date.now();
        const res = await page.goto(route, { waitUntil: "networkidle", timeout: 90_000 }).catch((e) => (add(`goto: ${e.message.slice(0, 120)}`), null));
        const ms = Date.now() - t0;
        if (res && res.status() >= 400) add(`status ${res.status()}`);
        const u = new URL(page.url());
        if (u.pathname !== route) add(`redirected to ${u.pathname}${u.search}`);
        const errText = page.getByText(/couldn.t load|something went wrong|application error|unhandled runtime error|try again later/i);
        if ((await errText.count()) > 0) add(`error text: ${(await errText.first().innerText()).slice(0, 140)}`);
        const overflow = await page.evaluate(() => {
          const w = document.documentElement.clientWidth;
          if (document.documentElement.scrollWidth <= w + 1) return null;
          const bad = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.right > w + 1 && r.width > 0 && getComputedStyle(el).position !== "fixed"; });
          const leaf = bad.filter((el) => !bad.some((o) => o !== el && el.contains(o))).slice(0, 3);
          return `${document.documentElement.scrollWidth}px > ${w}px: ` + leaf.map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`).join(" | ");
        });
        if (overflow) add(`h-overflow ${overflow}`);
        const h1 = await page.locator("h1").count();
        if (h1 !== 1) add(`h1 count ${h1}`);
        const unnamed = await page.evaluate(() => [...document.querySelectorAll("button, a[href]")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && !(el.getAttribute("aria-label") || el.textContent?.trim() || el.getAttribute("title") || el.querySelector("img[alt]")); }).length);
        if (unnamed) add(`${unnamed} buttons/links without accessible name`);
        if (ms > 8000) add(`slow: ${ms}ms`);
        await page.screenshot({ path: path.join(dir, `${route.replaceAll("/", "_") || "root"}.png`), fullPage: true });
      }
      writeFileSync(path.join(OUT, `${prefix}-${vp.name}.json`), JSON.stringify(findings, null, 2));
    });
  }
}
