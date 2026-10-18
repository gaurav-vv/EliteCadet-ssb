// @vitest-environment node
// app/auth/callback: email links (sign-up confirmation, password recovery,
// invites) land here. Only the Supabase server client is faked.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { GET } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";

function fake({ exchangeError = null, verifyError = null }: { exchangeError?: unknown; verifyError?: unknown } = {}) {
  const auth = {
    exchangeCodeForSession: vi.fn().mockResolvedValue({ error: exchangeError }),
    verifyOtp: vi.fn().mockResolvedValue({ error: verifyError }),
  };
  vi.mocked(createClient).mockResolvedValue({ auth } as unknown as Awaited<ReturnType<typeof createClient>>);
  return auth;
}

async function call(query: string) {
  const res = await GET(new Request(`http://localhost:3000/auth/callback${query}`));
  return new URL(res.headers.get("location")!);
}

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("/auth/callback", () => {
  it("exchanges a PKCE code and continues to the reset page", async () => {
    const auth = fake();
    const target = await call("?code=abc&next=%2Freset-password");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(target.href).toBe("http://localhost:3000/reset-password");
  });

  it("verifies a token_hash recovery link (works from any device)", async () => {
    const auth = fake();
    const target = await call("?token_hash=th&type=recovery");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "th" });
    expect(target.pathname).toBe("/reset-password");
  });

  it("sends an expired or reused reset link back to the reset request form", async () => {
    fake({ exchangeError: { code: "flow_state_not_found", status: 400 } });
    const target = await call("?code=used&next=%2Freset-password");
    expect(target.pathname).toBe("/forgot-password");
    expect(target.searchParams.get("reason")).toBe("link_invalid");
  });

  it("handles Supabase's own error redirect (otp_expired) for a reset link", async () => {
    fake();
    const target = await call("?next=%2Freset-password&error=access_denied&error_code=otp_expired");
    expect(target.pathname).toBe("/forgot-password");
  });

  it("sends other failed links to login", async () => {
    fake({ exchangeError: { code: "bad_code", status: 400 } });
    const target = await call("?code=bad&next=%2Fonboarding");
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("reason")).toBe("link_invalid");
  });

  it.each(["@evil.com", "//evil.com", "https://evil.com"])("never redirects off-site via next=%s", async (next) => {
    fake();
    const target = await call(`?code=abc&next=${encodeURIComponent(next)}`);
    expect(target.origin).toBe("http://localhost:3000");
    expect(target.pathname).toBe("/");
  });
});
