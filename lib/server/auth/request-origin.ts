import { headers } from "next/headers";

// This request's origin, for links in emails (invites, resets). Supabase Auth
// only honours it if it's on the project's redirect allow-list (site_url /
// additional_redirect_urls), so a forged Host header can't redirect elsewhere.
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}
