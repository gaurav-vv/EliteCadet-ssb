// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { ADMIN_NOT_SET_UP_MESSAGE, listAdminGrants, toAdminApiError, toAdminGrant } from "@/lib/api/admin-access";
import { createClient } from "@/lib/supabase/server";

const mockedCreateClient = vi.mocked(createClient);

function fakeRpc(result: { data: unknown; error: { code?: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  mockedCreateClient.mockResolvedValue({ rpc } as unknown as Awaited<ReturnType<typeof createClient>>);
  return rpc;
}

const ROW = { user_id: "u1", email: "a@b.co", full_name: "Asha", area: "mentor_content", created_at: "2026-10-07T00:00:00Z" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toAdminGrant (boundary validation, AGENTS.md §9)", () => {
  it("maps a well-formed row", () => {
    expect(toAdminGrant(ROW)).toEqual({ userId: "u1", email: "a@b.co", fullName: "Asha", area: "mentor_content", createdAt: ROW.created_at });
  });

  it("defaults a missing name to empty", () => {
    expect(toAdminGrant({ ...ROW, full_name: null })?.fullName).toBe("");
  });

  it("drops rows with a missing id/email/date or an unknown area", () => {
    expect(toAdminGrant(null)).toBeNull();
    expect(toAdminGrant("x")).toBeNull();
    expect(toAdminGrant({ ...ROW, user_id: 1 })).toBeNull();
    expect(toAdminGrant({ ...ROW, email: null })).toBeNull();
    expect(toAdminGrant({ ...ROW, created_at: undefined })).toBeNull();
    expect(toAdminGrant({ ...ROW, area: "owner" })).toBeNull();
  });
});

describe("toAdminApiError", () => {
  it.each(["PGRST202", "PGRST205", "42883", "42P01"])("maps %s to not_set_up with migration guidance", (code) => {
    expect(toAdminApiError({ code })).toEqual({ code: "not_set_up", message: ADMIN_NOT_SET_UP_MESSAGE });
  });

  it("maps 42501 (the SQL functions' non-super refusal) to unauthorized", () => {
    expect(toAdminApiError({ code: "42501" }).code).toBe("unauthorized");
  });

  it("maps anything else to a plain-language server_error, never the raw message", () => {
    const err = toAdminApiError({ code: "XX000" });
    expect(err.code).toBe("server_error");
    expect(err.message).not.toMatch(/XX000/);
  });
});

describe("listAdminGrants", () => {
  it("calls the super-only RPC and returns only valid rows", async () => {
    const rpc = fakeRpc({ data: [ROW, { bad: true }], error: null });
    const res = await listAdminGrants();
    expect(rpc).toHaveBeenCalledWith("admin_list_grants");
    expect(res.ok).toBe(true);
    expect(res.data).toHaveLength(1);
  });

  it("returns an empty list for no data", async () => {
    fakeRpc({ data: null, error: null });
    expect(await listAdminGrants()).toEqual({ ok: true, data: [] });
  });

  it("surfaces a mapped error instead of throwing", async () => {
    fakeRpc({ data: null, error: { code: "42501" } });
    const res = await listAdminGrants();
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("unauthorized");
  });
});
