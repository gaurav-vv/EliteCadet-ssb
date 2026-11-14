// @vitest-environment node
import { describe, expect, it } from "vitest";
import { canonicalSiteOrigin } from "@/lib/server/auth/request-origin";

describe("canonicalSiteOrigin", () => {
  it("uses Vercel's production domain on a production deployment, not the team-only URL the admin is on", () => {
    expect(canonicalSiteOrigin({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "elite-cadet-ssb.vercel.app" })).toBe(
      "https://elite-cadet-ssb.vercel.app",
    );
  });

  it("lets SITE_URL override it (custom domain), without a trailing slash", () => {
    expect(
      canonicalSiteOrigin({
        SITE_URL: "https://app.example.in/",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "elite-cadet-ssb.vercel.app",
      }),
    ).toBe("https://app.example.in");
  });

  it("returns null for previews and local dev, so they keep using the request's own origin", () => {
    expect(canonicalSiteOrigin({ VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "elite-cadet-ssb.vercel.app" })).toBeNull();
    expect(canonicalSiteOrigin({})).toBeNull();
  });
});
