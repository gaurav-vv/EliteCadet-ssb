import type { NextConfig } from "next";

// Static brand/landing images. Not `immutable`: the academy can replace a file
// in /public under the same name, so let browsers/CDNs reuse it for a day and
// revalidate quietly for a week afterwards.
const STATIC_ASSET_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  // AGENTS.md is a hand-maintained governance file (see its own §0) — don't
  // let `next dev` auto-append its own agent-rules block into it.
  agentRules: false,
  poweredByHeader: false,
  images: {
    // Smaller downloads than the original JPEG/PNG; the optimised copies are
    // kept for 30 days instead of the 4-hour default.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }] },
      { source: "/images/:path*", headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }] },
      // /academy is also an app route, so match the two image files only.
      {
        source: "/academy/:file(hero-banner|sidebar-card).:ext(jpg|jpeg|png|webp)",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
    ];
  },
};

export default nextConfig;
