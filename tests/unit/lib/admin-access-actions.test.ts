// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/admin", () => ({ getAdminGrants: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { grantAdminAccessAction, revokeAdminAccessAction } from "@/lib/actions/admin-access";
import { getAdminGrants } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

const SUPER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

const mockedGrants = vi.mocked(getAdminGrants);
const mockedCreateClient = vi.mocked(createClient);

function fakeSupabase(
  opts: {
    found?: { id: string }[];
    rpcError?: { code: string } | null;
    insertError?: { code: string } | null;
    deleted?: unknown[];
    deleteError?: { code: string } | null;
  } = {},
) {
  const insert = vi.fn().mockResolvedValue({ error: opts.insertError ?? null });
  const select = vi.fn().mockResolvedValue({ data: opts.deleteError ? null : (opts.deleted ?? [{ user_id: OTHER_ID }]), error: opts.deleteError ?? null });
  const eqArea = vi.fn(() => ({ select }));
  const eqUser = vi.fn(() => ({ eq: eqArea }));
  const del = vi.fn(() => ({ eq: eqUser }));
  const rpc = vi.fn().mockResolvedValue({ data: opts.rpcError ? null : (opts.found ?? [{ id: OTHER_ID }]), error: opts.rpcError ?? null });
  const from = vi.fn(() => ({ insert, delete: del }));
  mockedCreateClient.mockResolvedValue({ rpc, from } as unknown as Awaited<ReturnType<typeof createClient>>);
  return { rpc, insert, del, from, eqUser, eqArea };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("grantAdminAccessAction", () => {
  it.each([
    ["not signed in", null],
    ["an area editor", { userId: OTHER_ID, grants: ["student_content" as const] }],
    ["a user with no grants", { userId: OTHER_ID, grants: [] }],
  ])("refuses %s before touching the database", async (_label, session) => {
    mockedGrants.mockResolvedValue(session);
    const { rpc, insert } = fakeSupabase();
    const res = await grantAdminAccessAction({ email: "a@b.co", area: "student_content" });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("unauthorized");
    expect(rpc).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("validates input on the server", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    fakeSupabase();
    const res = await grantAdminAccessAction({ email: "not-an-email", area: "student_content" });
    expect(res.error?.code).toBe("validation_error");
  });

  it("reports an unknown email as not_found", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    const { insert } = fakeSupabase({ found: [] });
    const res = await grantAdminAccessAction({ email: "ghost@example.com", area: "mentor_content" });
    expect(res.error?.code).toBe("not_found");
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts the grant, recording who granted it", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    const { insert } = fakeSupabase();
    const res = await grantAdminAccessAction({ email: "Editor@Example.com", area: "mentor_content" });
    expect(res).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith({ user_id: OTHER_ID, area: "mentor_content", granted_by: SUPER_ID });
  });

  it("looks the email up through the super-only RPC, normalised", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    const { rpc } = fakeSupabase();
    await grantAdminAccessAction({ email: " Editor@Example.com ", area: "student_content" });
    expect(rpc).toHaveBeenCalledWith("admin_find_user_by_email", { p_email: "editor@example.com" });
  });

  it("maps a missing migration on lookup to setup guidance, not a raw error", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    const { insert } = fakeSupabase({ rpcError: { code: "PGRST202" } });
    const res = await grantAdminAccessAction({ email: "a@b.co", area: "student_content" });
    expect(res.error?.code).toBe("server_error");
    expect(res.error?.message).toMatch(/0004_admin_access\.sql/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("maps an RLS refusal on insert to unauthorized", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    fakeSupabase({ insertError: { code: "42501" } });
    expect((await grantAdminAccessAction({ email: "a@b.co", area: "student_content" })).error?.code).toBe("unauthorized");
  });

  it("maps any other insert failure to a plain-language server_error", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    fakeSupabase({ insertError: { code: "XX000" } });
    const res = await grantAdminAccessAction({ email: "a@b.co", area: "student_content" });
    expect(res.error?.code).toBe("server_error");
    expect(res.error?.message).not.toMatch(/XX000/);
  });

  it("explains a duplicate grant", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    fakeSupabase({ insertError: { code: "23505" } });
    const res = await grantAdminAccessAction({ email: "a@b.co", area: "student_content" });
    expect(res.error?.message).toMatch(/already/i);
  });
});

describe("revokeAdminAccessAction", () => {
  it("refuses a non-super caller", async () => {
    mockedGrants.mockResolvedValue({ userId: OTHER_ID, grants: ["student_content"] });
    const { del } = fakeSupabase();
    const res = await revokeAdminAccessAction(SUPER_ID, "super");
    expect(res.error?.code).toBe("unauthorized");
    expect(del).not.toHaveBeenCalled();
  });

  it("refuses to let a super admin remove their own super grant", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    const { del } = fakeSupabase();
    const res = await revokeAdminAccessAction(SUPER_ID, "super");
    expect(res.error?.code).toBe("validation_error");
    expect(del).not.toHaveBeenCalled();
  });

  it("rejects a malformed user id or area", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    const { del } = fakeSupabase();
    expect((await revokeAdminAccessAction("not-a-uuid", "student_content")).error?.code).toBe("validation_error");
    expect((await revokeAdminAccessAction(OTHER_ID, "root" as never)).error?.code).toBe("validation_error");
    expect(del).not.toHaveBeenCalled();
  });

  it("revokes exactly the targeted (user, area) grant", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    const { from, eqUser, eqArea } = fakeSupabase();
    expect(await revokeAdminAccessAction(OTHER_ID, "student_content")).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("admin_grants");
    expect(eqUser).toHaveBeenCalledWith("user_id", OTHER_ID);
    expect(eqArea).toHaveBeenCalledWith("area", "student_content");
  });

  it("lets a super admin remove their own non-super area", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super", "mentor_content"] });
    const { eqUser } = fakeSupabase({ deleted: [{ user_id: SUPER_ID }] });
    expect(await revokeAdminAccessAction(SUPER_ID, "mentor_content")).toEqual({ ok: true });
    expect(eqUser).toHaveBeenCalledWith("user_id", SUPER_ID);
  });

  it("maps a delete failure to a plain-language error", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    fakeSupabase({ deleteError: { code: "XX000" } });
    expect((await revokeAdminAccessAction(OTHER_ID, "student_content")).error?.code).toBe("server_error");
  });

  it("reports not_found when nothing was deleted", async () => {
    mockedGrants.mockResolvedValue({ userId: SUPER_ID, grants: ["super"] });
    fakeSupabase({ deleted: [] });
    expect((await revokeAdminAccessAction(OTHER_ID, "student_content")).error?.code).toBe("not_found");
  });
});
