import { headers } from "next/headers";

// The public address that links in server-sent emails (mentor / student
// invites) must point at, when there is one:
//   1. SITE_URL, if set (e.g. a custom domain) — an explicit override.
//   2. On a Vercel PRODUCTION deployment, the project's production domain,
//      which Vercel provides automatically (VERCEL_PROJECT_PRODUCTION_URL, the
//      shortest custom domain or the *.vercel.app one).
// Otherwise null: local dev and preview deployments keep using the request's
// own origin. Without this, an admin browsing a team-only deployment URL
// (behind Vercel Authentication) sent invites whose links opened Vercel's
// login page for the invitee instead of the app.
export function canonicalSiteOrigin(env: Record<string, string | undefined> = process.env): string | null {
  const explicit = env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const productionHost = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (env.VERCEL_ENV === "production" && productionHost) {
    return `https://${productionHost.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }
  return null;
}

// Origin for links in emails (invites). Supabase Auth only honours it if it's
// on the project's redirect allow-list (site_url / additional_redirect_urls),
// so a forged Host header can't redirect elsewhere.
export async function requestOrigin(): Promise<string> {
  const canonical = canonicalSiteOrigin();
  if (canonical) return canonical;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}
