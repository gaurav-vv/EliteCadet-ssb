// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({ authorize: vi.fn(), getActor: vi.fn(), isGuardFailure: (v: object) => "ok" in v }));
vi.mock("@/lib/server/content/repository", () => ({
  findContents: vi.fn(),
  countByCategory: vi.fn(),
  findContentById: vi.fn(),
  insertContent: vi.fn(),
  updateContent: vi.fn(),
  findAssignments: vi.fn().mockResolvedValue({ data: [], error: null }),
  insertAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  findBatchOptions: vi.fn(),
}));
vi.mock("@/lib/server/users/repository", () => ({ insertAudit: vi.fn().mockResolvedValue({ data: null, error: null }) }));

import { authorize, getActor } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/content/repository";
import * as service from "@/lib/server/content/service";
import { parseContentParams } from "@/lib/server/content/validation";
import { insertAudit } from "@/lib/server/users/repository";
import type { ContentRecord } from "@/types/content";

const SUPER = "11111111-1111-4111-8111-111111111111";
const C = "22222222-2222-4222-8222-222222222222";
const AC = "33333333-3333-4333-8333-333333333333";
const superActor = { id: SUPER, email: null, profile: { id: SUPER, role: "super_admin" as const, fullName: "S", academyId: null, status: "active" as const } };
const student = { id: "s", email: null, profile: { id: "s", role: "student" as const, fullName: "St", academyId: AC, status: "active" as const } };
const denied = { ok: false as const, error: { code: "unauthorized" as const, message: "no" } };
const content = (over: Partial<ContentRecord> = {}): ContentRecord => ({ id: C, title: "GD", description: null, category: "gto", type: "document", difficulty: "medium", targetRole: "student", visibility: "everyone", status: "draft", body: "x", externalUrl: null, createdAt: "t", updatedAt: "t", publishedAt: null, ...over });
const input = { title: "Group Discussion", category: "gto", type: "document", difficulty: "medium", targetRole: "student", visibility: "everyone", body: "text" };

beforeEach(() => {
  vi.mocked(authorize).mockReset();
  vi.mocked(getActor).mockReset();
  for (const fn of [repo.findContents, repo.countByCategory, repo.findContentById, repo.insertContent, repo.updateContent, repo.insertAssignment, repo.deleteAssignment]) vi.mocked(fn).mockReset();
  vi.mocked(insertAudit).mockClear();
});

describe("management is super-admin only", () => {
  it.each([
    ["getContentLibrary", () => service.getContentLibrary(parseContentParams({}))],
    ["createContent", () => service.createContent(input)],
    ["changeContentStatus", () => service.changeContentStatus(C, "published")],
    ["addContentAssignment", () => service.addContentAssignment(C, { academyId: AC })],
  ])("%s refuses others before any data access", async (_n, call) => {
    vi.mocked(authorize).mockResolvedValue(denied);
    expect((await call()).error?.code).toBe("unauthorized");
    expect(authorize).toHaveBeenCalledWith("content.manage");
    for (const fn of [repo.findContents, repo.insertContent, repo.updateContent, repo.insertAssignment]) expect(fn).not.toHaveBeenCalled();
  });
});

describe("createContent / status", () => {
  beforeEach(() => vi.mocked(authorize).mockResolvedValue(superActor));

  it("creates a draft owned by the actor, with an audit entry", async () => {
    vi.mocked(repo.insertContent).mockResolvedValue({ data: { id: C }, error: null });
    expect(await service.createContent(input)).toEqual({ ok: true, data: { id: C } });
    expect(repo.insertContent).toHaveBeenCalledWith(expect.objectContaining({ title: "Group Discussion" }), SUPER);
    expect(insertAudit).toHaveBeenCalledWith(expect.objectContaining({ action: "content.created", targetId: C }));
  });

  it("returns field errors without writing", async () => {
    const r = await service.createContent({ ...input, title: "x", externalUrl: "ftp://a" });
    expect(r.fieldErrors).toMatchObject({ title: expect.any(String), externalUrl: expect.any(String) });
    expect(repo.insertContent).not.toHaveBeenCalled();
  });

  it("publishes a draft but refuses archived → published", async () => {
    vi.mocked(repo.findContentById).mockResolvedValue({ data: content(), error: null });
    vi.mocked(repo.updateContent).mockResolvedValue({ data: 1, error: null });
    expect((await service.changeContentStatus(C, "published")).ok).toBe(true);
    expect(repo.updateContent).toHaveBeenCalledWith(C, { status: "published" }, SUPER);
    vi.mocked(repo.findContentById).mockResolvedValue({ data: content({ status: "archived" }), error: null });
    expect((await service.changeContentStatus(C, "published")).error?.code).toBe("validation_error");
  });
});

describe("assignments", () => {
  beforeEach(() => vi.mocked(authorize).mockResolvedValue(superActor));

  it("needs exactly one valid target", async () => {
    expect((await service.addContentAssignment(C, {})).error?.code).toBe("validation_error");
    expect((await service.addContentAssignment(C, { academyId: AC, batchId: AC })).error?.code).toBe("validation_error");
    expect((await service.addContentAssignment(C, { academyId: "nope" })).error?.code).toBe("validation_error");
    expect(repo.insertAssignment).not.toHaveBeenCalled();
  });

  it("assigns to an academy and explains duplicates", async () => {
    vi.mocked(repo.insertAssignment).mockResolvedValue({ data: null, error: null });
    expect((await service.addContentAssignment(C, { academyId: AC })).ok).toBe(true);
    expect(repo.insertAssignment).toHaveBeenCalledWith(C, { academyId: AC }, SUPER);
    vi.mocked(repo.insertAssignment).mockResolvedValue({ data: null, error: { code: "23505" } });
    expect((await service.addContentAssignment(C, { academyId: AC })).error?.message).toMatch(/already/);
  });
});

describe("readers", () => {
  it("only ever list published content", async () => {
    vi.mocked(getActor).mockResolvedValue(student);
    vi.mocked(repo.findContents).mockResolvedValue({ data: { rows: [], total: 0 }, error: null });
    await service.getLibrary(parseContentParams({ status: "draft" }));
    expect(repo.findContents).toHaveBeenCalledWith(expect.anything(), 1, { publishedOnly: true });
  });

  it("treat a draft (or RLS-hidden) item as not found", async () => {
    vi.mocked(getActor).mockResolvedValue(student);
    vi.mocked(repo.findContentById).mockResolvedValue({ data: content({ status: "draft" }), error: null });
    expect((await service.getLibraryItem(C)).error?.code).toBe("not_found");
    vi.mocked(repo.findContentById).mockResolvedValue({ data: null, error: null });
    expect((await service.getLibraryItem(C)).error?.code).toBe("not_found");
    vi.mocked(repo.findContentById).mockResolvedValue({ data: content({ status: "published" }), error: null });
    expect((await service.getLibraryItem(C)).ok).toBe(true);
  });

  it("refuse signed-out visitors", async () => {
    vi.mocked(getActor).mockResolvedValue(null);
    expect((await service.getLibrary(parseContentParams({}))).error?.code).toBe("unauthorized");
  });
});
