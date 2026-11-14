import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveConfig } from "../lib/config.mjs";
import { credentialsFor, ROLES } from "../lib/auth.mjs";
import { sanitize } from "../lib/report.mjs";

// Full browser journeys per role: sign in through the real form, land on the
// dashboard, move through the sidebar, then use back and forward. Lab measurements
// from one browser on one machine; they are NOT field (real-user) data and say
// nothing about devices or networks other than this one.
//
// Readiness is defined by content, not by the load event: a heading inside #workspace-content
// (the loading skeleton has none). No artificial waits are used.

const target = process.env.PERF_TARGET ?? "";
const baseUrl = process.env.PERF_BASE_URL ?? "";
let guard: { ok: true } | { ok: false; reason: string };
try {
  resolveConfig({ env: target, base: baseUrl, levels: "1" }, process.env);
  guard = { ok: true };
} catch (error) {
  guard = { ok: false, reason: (error as Error).message };
}

const roles = Object.keys(ROLES).filter((r) => credentialsFor(r));

// Hosts the app is responsible for: itself and its Supabase project. Anything else (publisher
// images on the news panel, for example) is a third party the app cannot control: its network
// failures are recorded in the results but do not fail the journey.
const firstPartyHosts = new Set([new URL(baseUrl || "http://invalid.local").host, process.env.PERF_SUPABASE_URL ? new URL(process.env.PERF_SUPABASE_URL).host : ""].filter(Boolean));
const isFirstParty = (url: string) => firstPartyHosts.has(new URL(url).host);
test.skip(!guard.ok, guard.ok ? "" : `unsafe or missing target: ${guard.ok ? "" : guard.reason}`);
test.skip(roles.length === 0, "no PERF_<ROLE>_EMAIL/_PASSWORD test accounts configured");

interface Vitals {
  lcp: number | null;
  cls: number;
  inp: number | null;
  longTasks: number;
}

const OBSERVERS = `
  window.__perf = { lcp: null, cls: 0, inp: null, longTasks: 0 };
  try { new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__perf.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.interactionId) window.__perf.inp = Math.max(window.__perf.inp ?? 0, e.duration); } }).observe({ type: "event", durationThreshold: 16, buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { window.__perf.longTasks += l.getEntries().length; }).observe({ type: "longtask", buffered: true }); } catch {}
`;

const readVitals = (page: Page) => page.evaluate(() => (window as unknown as { __perf: Vitals }).__perf);
// A page is ready when its own content has a heading. Some pages put the page title (h1) in the
// header, outside #workspace-content, so h1 alone is not enough; every page has an h1 or h2 in its
// content, and the loading skeleton has no headings at all, so this never matches a loading state.
const ready = (page: Page) => page.locator("#workspace-content").locator("h1, h2").first().waitFor({ state: "visible", timeout: 30_000 });
const ms = (t0: number) => Math.round(performance.now() - t0);

// The login form is server-rendered and then hydrated by React. A click on "Log in" before hydration
// finishes is a native form submit (the form has no action, so it just reloads /login and clears the
// fields): the page stays on /login with no error, which is what one flaky run recorded. Wait until React
// has attached to the form, which is a real readiness condition, before typing and submitting.
const formHydrated = (page: Page) => page.waitForFunction(() => {
  const form = document.querySelector("form");
  return Boolean(form && Object.keys(form).some((k) => k.startsWith("__reactProps$")));
}, undefined, { timeout: 30_000 });

const results: Record<string, unknown>[] = [];

test.afterAll(() => {
  const dir = path.join(__dirname, "..", "reports");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const run = { scenario: "browser", target, baseUrl, startedAt: new Date().toISOString(), note: "Lab data: one Chromium on one machine. Not field data.", roles: results };
  writeFileSync(path.join(dir, `browser-${target}-${stamp}.json`), sanitize(JSON.stringify(run, null, 2)));
});

for (const role of roles) {
  test(`${role}: login to dashboard, sidebar navigation, back/forward`, async ({ page }) => {
    const creds = credentialsFor(role)!;
    const requests: { host: string; path: string; type: string }[] = [];
    const failed: string[] = []; // first-party network failures: must be none
    const thirdPartyFailed: string[] = []; // recorded, not asserted
    let cancelled = 0; // ERR_ABORTED: the browser cancelling a link prefetch it no longer needs
    const jsErrors: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      requests.push({ host: u.host, path: u.pathname, type: r.resourceType() });
    });
    page.on("requestfailed", (r) => {
      if (/ERR_ABORTED/.test(r.failure()?.errorText ?? "")) cancelled += 1;
      else if (isFirstParty(r.url())) failed.push(`${r.method()} ${new URL(r.url()).pathname}: ${r.failure()?.errorText ?? "failed"}`);
      else thirdPartyFailed.push(`${new URL(r.url()).host}: ${r.failure()?.errorText ?? "failed"}`);
    });
    page.on("pageerror", (e) => jsErrors.push(e.message.slice(0, 120)));
    await page.addInitScript(OBSERVERS);
    // PERF_BLOCK_THIRD_PARTY=1 makes every non-first-party request fail, simulating an outage of the
    // publishers whose images the news panel shows. The journey must still pass: the app is not at fault.
    if (process.env.PERF_BLOCK_THIRD_PARTY === "1") await page.route((url) => !isFirstParty(url.href), (route) => route.abort("connectionfailed"));
    let step = "open login page";
    // If anything below fails, record where and what the page had done so far, so a flaky
    // run can be diagnosed instead of just re-run. (No values from the page are recorded.)
    const recordFailure = (error: unknown) => {
      results.push({ role, failedAtStep: step, error: String((error as Error)?.message ?? error).split("\n")[0].slice(0, 200), url: new URL(page.url()).pathname, failedRequests: failed.slice(0, 5), thirdPartyFailed: thirdPartyFailed.slice(0, 5), jsErrors: jsErrors.slice(0, 3), cancelledPrefetches: cancelled });
    };
    try {
    // --- login page, then sign in through the form -------------------------------
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await formHydrated(page);
    await page.getByLabel("Email").fill(creds.email);
    await page.getByLabel("Password", { exact: true }).fill(creds.password);
    const beforeLogin = requests.length;
    step = "submit login and wait for the dashboard heading";
    const t0 = performance.now();
    await page.getByRole("button", { name: /^log in$/i }).click();
    await ready(page);
    const loginToDashboardMs = ms(t0);
    const loginRequests = requests.slice(beforeLogin);
    const home = new URL(page.url()).pathname;

    // Let late paints and layout shifts register before reading vitals (a measurement
    // window, not a wait for a condition).
    await page.waitForLoadState("networkidle").catch(() => {});
    const dashboardVitals = await readVitals(page);

    // --- hard load of the dashboard (cold document, warm session) -----------------
    step = "hard load of the dashboard";
    const beforeReload = requests.length;
    const tReload = performance.now();
    await page.goto(home, { waitUntil: "commit" });
    await ready(page);
    const dashboardLoadMs = ms(tReload);
    const navTiming = await page.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      return n ? { ttfb: Math.round(n.responseStart), domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : null;
    });
    const reloadRequests = requests.slice(beforeReload);
    // JavaScript the dashboard document pulled (compressed bytes on the wire, from Resource Timing).
    await page.waitForLoadState("networkidle").catch(() => {});
    const scriptKB = await page.evaluate(() => {
      const bytes = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter((e) => e.initiatorType === "script" || e.name.split("?")[0].endsWith(".js")).reduce((sum, e) => sum + (e.encodedBodySize || 0), 0);
      return Math.round(bytes / 1024);
    });

    // --- sidebar navigation (client-side) -----------------------------------------
    step = "sidebar navigation";
    const links = await page.locator("aside nav a[href]").evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute("href") ?? ""));
    const routes = [...new Set(links)].filter((h) => h.startsWith("/") && h !== home).slice(0, 6);
    const navigation: { route: string; ms: number; requests: number }[] = [];
    for (const route of routes) {
      step = `navigate to ${route}`;
      const before = requests.length;
      const t = performance.now();
      await page.locator(`aside nav a[href="${route}"]`).first().click();
      await page.waitForURL((u) => u.pathname === route, { timeout: 30_000 });
      await ready(page);
      navigation.push({ route, ms: ms(t), requests: requests.length - before });
    }

    // --- back / forward -------------------------------------------------------------
    step = "back and forward";
    const history: { step: string; ms: number }[] = [];
    if (routes.length >= 2) {
      let t = performance.now();
      await page.goBack();
      await ready(page);
      history.push({ step: "back", ms: ms(t) });
      t = performance.now();
      await page.goForward();
      await ready(page);
      history.push({ step: "forward", ms: ms(t) });
    }

    const finalVitals = await readVitals(page);
    const byHost = requests.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.host]: (acc[r.host] ?? 0) + 1 }), {});
    results.push({
      role,
      loginToDashboardMs,
      loginRequests: loginRequests.length,
      dashboardLoadMs,
      dashboardScriptKB: scriptKB,
      navTiming,
      reloadRequests: reloadRequests.length,
      reloadRequestsByType: reloadRequests.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.type]: (acc[r.type] ?? 0) + 1 }), {}),
      dashboardVitals,
      sessionVitals: finalVitals,
      navigation,
      history,
      requestsByHost: byHost,
      failedRequests: failed.length,
      thirdPartyFailedRequests: thirdPartyFailed.length,
      thirdPartyHosts: [...new Set(requests.map((r) => r.host).filter((h) => !firstPartyHosts.has(h)))],
      cancelledPrefetches: cancelled,
      jsErrors: jsErrors.length,
      note: "Requests are those the BROWSER makes; the server's own Supabase calls are not visible here.",
    });

    // Functional guarantees of the journey. Vitals are recorded, not asserted as a pass.
    expect(page.url()).toContain(home);
    expect(failed, "failed first-party network requests (the app or its Supabase)").toEqual([]);
    // PERF_STRICT_THIRD_PARTY=1 also fails on third-party network errors (the previous behaviour).
    if (process.env.PERF_STRICT_THIRD_PARTY === "1") expect(thirdPartyFailed, "failed third-party network requests").toEqual([]);
    expect(jsErrors, "uncaught JavaScript errors").toEqual([]);
    expect(navigation.length).toBeGreaterThan(0);
    } catch (error) {
      recordFailure(error);
      throw error;
    }
  });
}

// Charts are loaded lazily (recharts is about 350 KB). They must still draw once their
// chunk arrives, and drawing them must not shift the page.
const chartPages: Record<string, string> = { student: "/student/progress", academy_admin: "/academy" };
for (const [role, route] of Object.entries(chartPages)) {
  test(`${role}: the lazily loaded chart still renders on ${route}`, async ({ page }) => {
    test.skip(!roles.includes(role), `no ${role} test account`);
    const creds = credentialsFor(role)!;
    await page.addInitScript(OBSERVERS);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await formHydrated(page);
    await page.getByLabel("Email").fill(creds.email);
    await page.getByLabel("Password", { exact: true }).fill(creds.password);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await ready(page);
    await page.goto(route, { waitUntil: "commit" });
    await ready(page);
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    const vitals = await readVitals(page);
    results.push({ role, chartRoute: route, chartRendered: true, cls: Number(vitals.cls.toFixed(4)) });
    expect.soft(vitals.cls, "layout shift while the chart loaded").toBeLessThanOrEqual(0.1);
  });
}
