import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is a hand-maintained governance file (see its own §0) — don't
  // let `next dev` auto-append its own agent-rules block into it.
  agentRules: false,
};

export default nextConfig;
