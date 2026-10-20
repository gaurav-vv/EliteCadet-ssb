import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("every section, nav link and CTA points at a real route or section", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Your SSB Journey with the Right Guidance" })).toBeVisible();
    for (const id of ["students", "mentors", "academics", "how-it-works", "about"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const [name, href] of [["Home", "/"], ["Students", "/#students"], ["Mentors", "/#mentors"], ["Academics", "/#academics"], ["How It Works", "/#how-it-works"], ["About", "/#about"]]) {
      await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }

    const ctas: [string, string][] = [
      ["Request a Demo", "/request-demo"],
      ["Sign Up / Login", "/signup"],
      ["Explore as a Student", "/signup"],
      ["Join as a Mentor", "/request-demo?interest=mentor"],
      ["Explore for Academics", "/signup?as=academy"],
    ];
    for (const [name, href] of ctas) {
      await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }
    // No invented usage statistics on the page.
    await expect(page.getByText(/\d+K\+|\d+%|\d\.\d\/5/)).toHaveCount(0);
  });

  test("Explore for Academics preselects the academy signup", async ({ page }) => {
    await page.goto("/signup?as=academy");
    await expect(page.getByLabel("Academy name")).toBeVisible();
  });

  test("mobile menu opens and links to login", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Mentors" }).isVisible();
    await page.locator("#site-mobile-menu").getByRole("link", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("request demo form validates, then submits", async ({ page }) => {
    test.skip(!process.env.E2E_MAILPIT_URL, "writes a row — local Supabase stack only (set E2E_MAILPIT_URL)");
    await page.goto("/request-demo?interest=academy");
    await expect(page.getByLabel("I run an academy or institution")).toBeChecked();
    await page.getByRole("button", { name: "Request Demo" }).click();
    await expect(page.getByText("Please check the highlighted fields.")).toBeVisible();
    await expect(page.getByText("Enter your academy or institution's name.")).toBeVisible();
    await page.getByLabel("Full name").fill("E2E Demo");
    await page.getByLabel("Email").fill(`demo.${Date.now()}@example.test`);
    await page.getByRole("textbox", { name: "Academy or institution" }).fill("E2E Academy");
    await page.getByRole("button", { name: "Request Demo" }).click();
    await expect(page.getByRole("status")).toContainText("your request has been sent");
  });
});
