// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

import { logIn, SUSPENDED_MESSAGE } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/client";

function fakeClient(profile: { role: string; status: string } | null) {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const single = vi.fn().mockResolvedValue({ data: profile });
  vi.mocked(createClient).mockReturnValue({
    auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }), signOut },
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) })),
  } as unknown as ReturnType<typeof createClient>);
  return { signOut };
}

describe("logIn and account status", () => {
  it("signs a suspended account straight back out with a clear message", async () => {
    const { signOut } = fakeClient({ role: "student", status: "suspended" });
    const res = await logIn({ email: "a@b.co", password: "password1" });
    expect(res).toEqual({ ok: false, error: { code: "account_suspended", message: SUSPENDED_MESSAGE } });
    expect(signOut).toHaveBeenCalled();
  });

  it("returns the role for an active account, including super_admin", async () => {
    const { signOut } = fakeClient({ role: "super_admin", status: "active" });
    expect(await logIn({ email: "a@b.co", password: "password1" })).toEqual({ ok: true, data: { role: "super_admin" } });
    expect(signOut).not.toHaveBeenCalled();
  });
});
