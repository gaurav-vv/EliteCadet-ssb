
import type { NextConfig } from "next";

// Static brand/landing images. Not `immutable`: the academy can replace a file
// in /public under the same name, so let browsers/CDNs reuse it for a day and
// revalidate quietly for a week afterwards.
const STATIC_ASSET_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  agentRules: false,
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

export default nextConfig;
