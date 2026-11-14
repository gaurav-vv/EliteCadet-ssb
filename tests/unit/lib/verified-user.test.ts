// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { getVerifiedUser } from "@/lib/supabase/claims";

const client = (result: unknown) => ({ auth: { getClaims: vi.fn().mockResolvedValue(result), getUser: vi.fn() } });

describe("getVerifiedUser", () => {
  it("returns the id and email from verified claims, without a getUser() round trip", async () => {
    const c = client({ data: { claims: { sub: "u1", email: "a@b.co" } }, error: null });
    expect(await getVerifiedUser(c as never)).toEqual({ id: "u1", email: "a@b.co" });
    expect(c.auth.getUser).not.toHaveBeenCalled();
  });

  it("has a null email when the token carries none", async () => {
    expect(await getVerifiedUser(client({ data: { claims: { sub: "u1" } }, error: null }) as never)).toEqual({ id: "u1", email: null });
  });

  it.each([
    ["no session", { data: null, error: null }],
    ["a failed signature / expired token", { data: null, error: { message: "Invalid JWT signature" } }],
    ["claims without a subject", { data: { claims: { role: "authenticated" } }, error: null }],
    ["an empty subject", { data: { claims: { sub: "" } }, error: null }],
    ["a non-string subject", { data: { claims: { sub: 42 } }, error: null }],
  ])("is null for %s", async (_label, result) => {
    expect(await getVerifiedUser(client(result) as never)).toBeNull();
  });
});
