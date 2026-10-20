// @vitest-environment node
// The users service against a mocked guard + repository: authorization is
// checked before any data access, business rules run server-side, and every
// successful change is audited.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({
  authorize: vi.fn(),
  isGuardFailure: (v: object) => "ok" in v,
}));
vi.mock("@/lib/server/users/repository", () => ({
  findUsers: vi.fn(),
  findUserById: vi.fn(),
  countPlatform: vi.fn(),
  findRecentUsers: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
  insertAudit: vi.fn().mockResolvedValue({ data: null, error: null }),
  findAuditForTarget: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

import { authorize } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/users/repository";
import { changeUserRole, changeUserStatus, getUserDetail, getUserList, mapDbError, USERS_NOT_SET_UP_MESSAGE } from "@/lib/server/users/service";
import type { UserRecord } from "@/types/users";

const SUPER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const actor = { id: SUPER, email: "s@x.co", profile: { id: SUPER, role: "super_admin" as const, fullName: "Sam", academyId: null, status: "active" as const } };
const denied = { ok: false as const, error: { code: "unauthorized" as const, message: "You don't have permission to do that." } };

function user(over: Partial<UserRecord> = {}): UserRecord {
  return { id: OTHER, fullName: "Asha", email: "a@x.co", phone: null, role: "student", status: "active", academyId: null, academyName: null, lastLoginAt: null, createdAt: "2026-10-01T00:00:00Z", ...over };
}

const params = { q: "", role: "all" as const, status: "all" as const, sort: "newest" as const, page: 1 };

beforeEach(() => {
  vi.mocked(authorize).mockReset();
  for (const fn of [repo.findUsers, repo.findUserById, repo.updateUserRole, repo.updateUserStatus]) vi.mocked(fn).mockReset();
  vi.mocked(repo.insertAudit).mockClear();
});

describe("authorization comes first", () => {
  it.each([
    ["getUserList", () => getUserList(params), repo.findUsers],
    ["getUserDetail", () => getUserDetail(OTHER), repo.findUserById],
    ["changeUserRole", () => changeUserRole(OTHER, "mentor"), repo.findUserById],
    ["changeUserStatus", () => changeUserStatus(OTHER, "suspended"), repo.findUserById],
  ])("%s refuses a non-super-admin without touching the database", async (_name, call, repoFn) => {
    vi.mocked(authorize).mockResolvedValue(denied);
    const res = await call();
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("unauthorized");
    expect(repoFn).not.toHaveBeenCalled();
    expect(repo.updateUserRole).not.toHaveBeenCalled();
    expect(repo.updateUserStatus).not.toHaveBeenCalled();
  });

  it("checks the specific permission for each mutation", async () => {
    vi.mocked(authorize).mockResolvedValue(denied);
    await changeUserRole(OTHER, "mentor");
    expect(authorize).toHaveBeenCalledWith("users.change_role");
    await changeUserStatus(OTHER, "suspended");
    expect(authorize).toHaveBeenCalledWith("users.change_status");
  });
});

describe("getUserList", () => {
  it("clamps a stale page to the last real page", async () => {
    vi.mocked(authorize).mockResolvedValue(actor);
    vi.mocked(repo.findUsers)
      .mockResolvedValueOnce({ data: { rows: [], total: 25 }, error: null })
      .mockResolvedValueOnce({ data: { rows: [user()], total: 25 }, error: null });
    const res = await getUserList({ ...params, page: 9 });
    expect(res.data).toMatchObject({ page: 2, pageCount: 2, total: 25 });
    expect(repo.findUsers).toHaveBeenLastCalledWith(expect.anything(), 2);
  });

  it("maps a missing migration to setup guidance", async () => {
    vi.mocked(authorize).mockResolvedValue(actor);
    vi.mocked(repo.findUsers).mockResolvedValue({ data: null, error: { code: "42703" } });
    const res = await getUserList(params);
    expect(res.error).toEqual({ code: "not_set_up", message: USERS_NOT_SET_UP_MESSAGE });
  });
});

describe("getUserDetail", () => {
  it("treats a malformed id as not found without querying", async () => {
    vi.mocked(authorize).mockResolvedValue(actor);
    expect((await getUserDetail("../etc")).error?.code).toBe("not_found");
    expect(repo.findUserById).not.toHaveBeenCalled();
  });

  it("flags the actor's own record", async () => {
    vi.mocked(authorize).mockResolvedValue(actor);
    vi.mocked(repo.findUserById).mockResolvedValue({ data: user({ id: SUPER, role: "super_admin" }), error: null });
    expect((await getUserDetail(SUPER)).data?.isSelf).toBe(true);
  });
});

describe("changeUserRole", () => {
  beforeEach(() => vi.mocked(authorize).mockResolvedValue(actor));

  it("updates and audits a valid change", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({ data: user(), error: null });
    vi.mocked(repo.updateUserRole).mockResolvedValue({ data: 1, error: null });
    expect(await changeUserRole(OTHER, "super_admin")).toEqual({ ok: true, data: null });
    expect(repo.updateUserRole).toHaveBeenCalledWith(OTHER, "super_admin");
    expect(repo.insertAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: SUPER, action: "user.role_changed", targetId: OTHER, details: expect.objectContaining({ from: "student", to: "super_admin" }) }),
    );
  });

  it("refuses a self-change, and a mentor role without an academy, before writing", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({ data: user({ id: SUPER, role: "super_admin" }), error: null });
    expect((await changeUserRole(SUPER, "student")).error?.code).toBe("validation_error");
    vi.mocked(repo.findUserById).mockResolvedValue({ data: user(), error: null });
    expect((await changeUserRole(OTHER, "mentor")).error?.code).toBe("validation_error");
    expect(repo.updateUserRole).not.toHaveBeenCalled();
    expect(repo.insertAudit).not.toHaveBeenCalled();
  });

  it("maps an RLS/trigger refusal to unauthorized and does not audit", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({ data: user(), error: null });
    vi.mocked(repo.updateUserRole).mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await changeUserRole(OTHER, "super_admin")).error?.code).toBe("unauthorized");
    expect(repo.insertAudit).not.toHaveBeenCalled();
  });

  it("reports not_found when the user vanished", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({ data: null, error: null });
    expect((await changeUserRole(OTHER, "student")).error?.code).toBe("not_found");
  });
});

describe("changeUserStatus", () => {
  beforeEach(() => vi.mocked(authorize).mockResolvedValue(actor));

  it("suspends and audits", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({ data: user(), error: null });
    vi.mocked(repo.updateUserStatus).mockResolvedValue({ data: 1, error: null });
    expect((await changeUserStatus(OTHER, "suspended")).ok).toBe(true);
    expect(repo.insertAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "user.suspended", targetId: OTHER }));
  });

  it("refuses suspending yourself", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({ data: user({ id: SUPER }), error: null });
    expect((await changeUserStatus(SUPER, "suspended")).error?.code).toBe("validation_error");
    expect(repo.updateUserStatus).not.toHaveBeenCalled();
  });

  it("reports not_found when no row was updated", async () => {
    vi.mocked(repo.findUserById).mockResolvedValue({ data: user(), error: null });
    vi.mocked(repo.updateUserStatus).mockResolvedValue({ data: 0, error: null });
    expect((await changeUserStatus(OTHER, "suspended")).error?.code).toBe("not_found");
  });
});

describe("mapDbError", () => {
  it("never leaks the raw error", () => {
    const res = mapDbError({ code: "XX000", message: "relation secret_table blew up" });
    expect(res.error?.code).toBe("server_error");
    expect(res.error?.message).not.toMatch(/secret_table/);
  });
});
