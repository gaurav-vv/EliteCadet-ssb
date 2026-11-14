import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is a hand-maintained governance file (see its own §0) — don't
  // let `next dev` auto-append its own agent-rules block into it.
  agentRules: false,
  // `next dev` only: lets a phone on the same Wi-Fi open the app at this
  // computer's address (the host in NEXT_PUBLIC_SUPABASE_URL when that isn't
  // localhost), e.g. from a local invite or password-reset email.
  allowedDevOrigins: lanDevHosts(),
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
