import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is a hand-maintained governance file (see its own §0) — don't
  // let `next dev` auto-append its own agent-rules block into it.
  agentRules: false,
  images: {
    // The only remote images next/image may fetch: photos published inside
    // PIB press releases (lib/api/news.ts, same rule as isAllowedNewsImage)
    // and YouTube's own thumbnails for the curated video list.
    remotePatterns: [
      { protocol: "https", hostname: "static.pib.gov.in", pathname: "/WriteReadData/userfiles/image/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  },
};

export default nextConfig;
