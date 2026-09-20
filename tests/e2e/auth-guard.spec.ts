import { test, expect } from "@playwright/test";

// These exercise the real middleware (lib/supabase/middleware.ts), which
// calls supabase.auth.getUser() against the project configured in
// .env.local. They need that project to be reachable — see
// tests/TEST_CASES.md "Automated suite" for setup notes — but never sign in,
// so they don't touch or depend on any specific account existing.
test.describe("Route guard redirects an unauthenticated visitor (AGENTS.md §10)", () => {
  const protectedPaths = ["/student", "/mentor", "/academy", "/onboarding"];

  for (const path of protectedPaths) {
    test(`${path} redirects to /login when logged out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?/);
      const url = new URL(page.url());
      expect(url.searchParams.get("reason")).toBe("login_required");
      expect(url.searchParams.get("next")).toBe(path);
    });
  }

  test("a nested protected path preserves the full next= target", async ({ page }) => {
    await page.goto("/student/practice/interview");
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/student/practice/interview");
  });

  test("/forbidden itself is reachable without a session (it is the redirect target, not a guarded route)", async ({ page }) => {
    await page.goto("/forbidden");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
