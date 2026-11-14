import type { NextConfig } from "next";

// Static brand/landing images. Not `immutable`: the academy can replace a file
// in /public under the same name, so let browsers/CDNs reuse it for a day and
// revalidate quietly for a week afterwards.
const STATIC_ASSET_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  agentRules: false,
  // `next dev` only: lets a phone on the same Wi-Fi open the app at this
  // computer's address (the host in NEXT_PUBLIC_SUPABASE_URL when that isn't
  // localhost), e.g. from a local invite or password-reset email.
  allowedDevOrigins: lanDevHosts(),
  poweredByHeader: false,
  images: {
    // Remote images used by PIB news articles and curated YouTube thumbnails.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.pib.gov.in",
        pathname: "/WriteReadData/userfiles/image/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: "/academy/:file(hero-banner|sidebar-card).:ext(jpg|jpeg|png|webp)",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
    ];
  },
};

function lanDevHosts(): string[] {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    return host && host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".supabase.co") ? [host] : [];
  } catch {
    return [];
  }
}

export default nextConfig;
