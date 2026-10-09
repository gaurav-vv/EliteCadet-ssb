// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn(), authorize: vi.fn(), isGuardFailure: (v: object) => "ok" in v }));
vi.mock("@/lib/server/academy-people/repository", () => ({ findMyBatchIds: vi.fn() }));
vi.mock("@/lib/server/content/repository", () => ({
  findContents: vi.fn(),
  countByCategory: vi.fn(),
  findContentById: vi.fn(),
  insertContent: vi.fn(),
  updateContent: vi.fn(),
  findAssignments: vi.fn().mockResolvedValue({ data: [], error: null }),
  insertAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
}));
vi.mock("@/lib/server/users/repository", () => ({ insertAudit: vi.fn().mockResolvedValue({ data: null, error: null }) }));

import { getActor } from "@/lib/server/auth/guard";
import { findMyBatchIds } from "@/lib/server/academy-people/repository";
import * as repo from "@/lib/server/content/repository";
import * as service from "@/lib/server/content/mentor-service";
import type { ContentRecord } from "@/types/content";

const ME = "11111111-1111-4111-8111-111111111111";
const C = "22222222-2222-4222-8222-222222222222";
const MY_BATCH = "33333333-3333-4333-8333-333333333333";
const OTHER_BATCH = "44444444-4444-4444-8444-444444444444";
const actor = (role: "mentor" | "student" | "super_admin") => ({ id: ME, email: null, profile: { id: ME, role, fullName: "M", academyId: "a", status: "active" as const } });
const content = (over: Partial<ContentRecord> = {}): ContentRecord => ({ id: C, title: "GD tips", description: null, category: "gto", type: "document", difficulty: "medium", targetRole: "student", visibility: "assigned", status: "draft", body: "x", externalUrl: null, ownerType: "mentor", isTemplate: false, templateSourceId: null, createdAt: "t", updatedAt: "t", publishedAt: null, ...over });
const mine = { type: "mentor", id: ME };
const input = { title: "GD tips for Batch A", category: "gto", type: "document", difficulty: "medium", body: "Lead with structure." };

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  vi.mocked(findMyBatchIds).mockReset();
  for (const fn of [repo.findContents, repo.findContentById, repo.insertContent, repo.updateContent, repo.insertAssignment, repo.deleteAssignment]) vi.mocked(fn).mockReset();
});

describe("mentor-only", () => {
  it.each([["a student", actor("student")], ["a super admin", actor("super_admin")], ["nobody", null]])("refuses %s", async (_n, a) => {
    vi.mocked(getActor).mockResolvedValue(a);
    expect((await service.createMyContent(input)).error?.code).toBe("unauthorized");
    expect((await service.copyTemplate(C)).error?.code).toBe("unauthorized");
    expect((await service.assignMyContent(C, MY_BATCH)).error?.code).toBe("unauthorized");
    expect(repo.insertContent).not.toHaveBeenCalled();
  });
});

describe("own content", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("mentor")));

  it("creates content owned by the mentor, pinned to assigned/student, never a template", async () => {
    vi.mocked(repo.insertContent).mockResolvedValue({ data: { id: C }, error: null });
    await service.createMyContent({ ...input, visibility: "everyone", targetRole: "mentor", isTemplate: true });
    const [values, actorId, owner] = vi.mocked(repo.insertContent).mock.calls[0];
    expect(values).toMatchObject({ visibility: "assigned", target_role: "student" });
    expect(values).not.toHaveProperty("is_template");
    expect(actorId).toBe(ME);
    expect(owner).toEqual(mine);
  });

  it("scopes every edit to the mentor's own content (others are not found)", async () => {
    vi.mocked(repo.updateContent).mockResolvedValue({ data: 0, error: null });
    expect((await service.updateMyContent(C, input)).error?.code).toBe("not_found");
    expect(vi.mocked(repo.updateContent).mock.calls[0][3]).toEqual(mine);
    vi.mocked(repo.findContentById).mockResolvedValue({ data: null, error: null });
    expect((await service.changeMyContentStatus(C, "published")).error?.code).toBe("not_found");
    expect(repo.findContentById).toHaveBeenCalledWith(C, mine);
  });
});

describe("sharing with batches", () => {
  beforeEach(() => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor"));
    vi.mocked(repo.findContentById).mockResolvedValue({ data: content(), error: null });
    vi.mocked(findMyBatchIds).mockResolvedValue({ data: [{ id: MY_BATCH, name: "A" }], error: null });
  });

  it("shares only with batches the mentor teaches", async () => {
    expect((await service.assignMyContent(C, OTHER_BATCH)).error?.message).toMatch(/batches you teach/);
    expect(repo.insertAssignment).not.toHaveBeenCalled();
    vi.mocked(repo.insertAssignment).mockResolvedValue({ data: null, error: null });
    expect((await service.assignMyContent(C, MY_BATCH)).ok).toBe(true);
    expect(repo.insertAssignment).toHaveBeenCalledWith(C, { batchId: MY_BATCH }, ME);
  });
});

describe("templates", () => {
  beforeEach(() => vi.mocked(getActor).mockResolvedValue(actor("mentor")));

  it("copies a published template into the mentor's own draft, remembering its source", async () => {
    vi.mocked(repo.findContentById).mockResolvedValue({ data: content({ ownerType: "platform", isTemplate: true, status: "published", visibility: "everyone" }), error: null });
    vi.mocked(repo.insertContent).mockResolvedValue({ data: { id: "new" }, error: null });
    expect(await service.copyTemplate(C)).toEqual({ ok: true, data: { id: "new" } });
    expect(repo.findContentById).toHaveBeenCalledWith(C, { type: "platform" });
    const [values, , owner] = vi.mocked(repo.insertContent).mock.calls[0];
    expect(values).toMatchObject({ template_source_id: C, visibility: "assigned", target_role: "student" });
    expect(owner).toEqual(mine);
    expect(repo.updateContent).not.toHaveBeenCalled();
  });

  it("refuses non-templates and unpublished templates", async () => {
    vi.mocked(repo.findContentById).mockResolvedValue({ data: content({ ownerType: "platform", isTemplate: false, status: "published" }), error: null });
    expect((await service.copyTemplate(C)).error?.code).toBe("not_found");
    vi.mocked(repo.findContentById).mockResolvedValue({ data: content({ ownerType: "platform", isTemplate: true, status: "draft" }), error: null });
    expect((await service.copyTemplate(C)).error?.code).toBe("not_found");
    expect(repo.insertContent).not.toHaveBeenCalled();
  });
});
