// Content service (specs.md §8a.4): Super Admin manages global content;
// students, mentors and academy admins read what RLS lets them see.

import { authorize, getActor, isGuardFailure } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/content/repository";
import { canTransition, CONTENT_PAGE_SIZE, isContentStatus, validateContentInput, type ContentFieldErrors } from "@/lib/server/content/validation";
import { insertAudit } from "@/lib/server/users/repository";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import { CONTENT_STATUSES, type ContentAssignment, type ContentCategoryCounts, type ContentInput, type ContentListParams, type ContentListResult, type ContentRecord } from "@/types/content";

export type ContentServiceResult<T> = ServiceResult<T> & { fieldErrors?: ContentFieldErrors };

const fail = <T>(code: "validation_error" | "not_found" | "unauthorized", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const NOT_FOUND = "We couldn't find that content.";
const PLATFORM: repo.ContentOwner = { type: "platform" };

export async function paged(params: ContentListParams, opts: { publishedOnly?: boolean; owner?: repo.ContentOwner; templatesOnly?: boolean }): Promise<ServiceResult<ContentListResult>> {
  let page = params.page;
  let found = await repo.findContents(params, page, opts);
  if (found.error) return mapDbError(found.error, "We couldn't load content. Please try again.");
  const pageCount = Math.max(1, Math.ceil(found.data.total / CONTENT_PAGE_SIZE));
  if (page > pageCount) {
    page = pageCount;
    found = await repo.findContents(params, page, opts);
    if (found.error) return mapDbError(found.error, "We couldn't load content. Please try again.");
  }
  return { ok: true, data: { rows: found.data.rows, total: found.data.total, page, pageCount, pageSize: CONTENT_PAGE_SIZE } };
}

// ---- Super Admin -------------------------------------------------------------

export async function getContentLibrary(params: ContentListParams): Promise<ServiceResult<{ list: ContentListResult; counts: ContentCategoryCounts }>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  const [list, counts] = await Promise.all([paged(params, { owner: PLATFORM }), repo.countByCategory()]);
  if (!list.ok || !list.data) return list as ServiceResult<never>;
  if (counts.error) return mapDbError(counts.error, "We couldn't load content totals. Please try again.");
  return { ok: true, data: { list: list.data, counts: counts.data } };
}

export async function getContentForEdit(id: string): Promise<ServiceResult<{ content: ContentRecord; assignments: ContentAssignment[] }>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const found = await repo.findContentById(id, PLATFORM);
  if (found.error) return mapDbError(found.error, "We couldn't load this content. Please try again.");
  if (!found.data) return fail("not_found", NOT_FOUND);
  const assignments = await repo.findAssignments(id);
  if (assignments.error) return mapDbError(assignments.error);
  return { ok: true, data: { content: found.data, assignments: assignments.data } };
}

export async function getAssignmentTargets(): Promise<ServiceResult<{ batches: { id: string; name: string }[] }>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  const batches = await repo.findBatchOptions();
  if (batches.error) return mapDbError(batches.error);
  return { ok: true, data: { batches: batches.data } };
}

export async function createContent(input: Partial<Record<keyof ContentInput, unknown>>): Promise<ContentServiceResult<{ id: string }>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  const parsed = validateContentInput(input);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const created = await repo.insertContent(parsed.value, actor.id);
  if (created.error) return mapDbError(created.error, "We couldn't save the content. Please try again.");
  await insertAudit({ actorId: actor.id, action: "content.created", targetType: "content", targetId: created.data.id, details: { summary: `Content "${parsed.value.title}" created as a draft` } });
  return { ok: true, data: created.data };
}

export async function updateContentDetails(id: string, input: Partial<Record<keyof ContentInput, unknown>>): Promise<ContentServiceResult<null>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const parsed = validateContentInput(input);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const updated = await repo.updateContent(id, parsed.value, actor.id);
  if (updated.error) return mapDbError(updated.error, "We couldn't save the content. Please try again.");
  if (updated.data === 0) return fail("not_found", NOT_FOUND);
  await insertAudit({ actorId: actor.id, action: "content.updated", targetType: "content", targetId: id, details: { summary: "Content edited" } });
  return { ok: true, data: null };
}

export async function changeContentStatus(id: string, status: unknown): Promise<ServiceResult<null>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  if (!isContentStatus(status)) return fail("validation_error", "Choose a valid status.");
  const found = await repo.findContentById(id, PLATFORM);
  if (found.error) return mapDbError(found.error);
  if (!found.data) return fail("not_found", NOT_FOUND);
  if (!canTransition(found.data.status, status)) return fail("validation_error", `Content that is ${CONTENT_STATUSES[found.data.status].toLowerCase()} can't move to ${CONTENT_STATUSES[status].toLowerCase()}.`);

  const updated = await repo.updateContent(id, { status }, actor.id);
  if (updated.error) return mapDbError(updated.error, "We couldn't change the status. Please try again.");
  if (updated.data === 0) return fail("not_found", NOT_FOUND);
  await insertAudit({ actorId: actor.id, action: `content.${status}`, targetType: "content", targetId: id, details: { summary: `Status changed to ${CONTENT_STATUSES[status]}` } });
  return { ok: true, data: null };
}

export async function addContentAssignment(contentId: string, target: { academyId?: unknown; batchId?: unknown }): Promise<ServiceResult<null>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(contentId)) return fail("not_found", NOT_FOUND);
  const academyId = isUuid(target.academyId) ? target.academyId : null;
  const batchId = isUuid(target.batchId) ? target.batchId : null;
  if ((academyId === null) === (batchId === null)) return fail("validation_error", "Choose one academy or one batch.");
  const added = await repo.insertAssignment(contentId, academyId ? { academyId } : { batchId: batchId! }, actor.id);
  if (added.error) {
    if (added.error.code === "23505") return fail("validation_error", "It's already assigned there.");
    if (added.error.code === "23503") return fail("validation_error", "That academy or batch no longer exists.");
    return mapDbError(added.error, "We couldn't assign the content. Please try again.");
  }
  return { ok: true, data: null };
}

export async function removeContentAssignment(contentId: string, assignmentId: string): Promise<ServiceResult<null>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(contentId) || !isUuid(assignmentId)) return fail("not_found", "That assignment no longer exists.");
  const removed = await repo.deleteAssignment(contentId, assignmentId);
  if (removed.error) return mapDbError(removed.error);
  if (removed.data === 0) return fail("not_found", "That assignment no longer exists.");
  return { ok: true, data: null };
}

// ---- Readers (students, mentors, academy admins) ----------------------------
// No filtering by role/academy/batch here on purpose: RLS (can_read_content)
// is the single source of that rule. This only adds "published" and paging.

async function reader() {
  const actor = await getActor();
  return actor && actor.profile.role !== "super_admin" ? actor : null;
}

export async function getLibrary(params: ContentListParams): Promise<ServiceResult<ContentListResult>> {
  if (!(await reader())) return fail("unauthorized", "Sign in to see your library.");
  return paged(params, { publishedOnly: true });
}

export async function getLibraryItem(id: string): Promise<ServiceResult<ContentRecord>> {
  if (!(await reader())) return fail("unauthorized", "Sign in to see your library.");
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const found = await repo.findContentById(id);
  if (found.error) return mapDbError(found.error);
  // RLS returns nothing for content this reader may not see — same as missing.
  if (!found.data || found.data.status !== "published") return fail("not_found", NOT_FOUND);
  return { ok: true, data: found.data };
}

export async function getPlatformContentOptions(): Promise<ServiceResult<{ id: string; name: string }[]>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  const found = await repo.findPlatformContentOptions();
  if (found.error) return mapDbError(found.error);
  return { ok: true, data: found.data };
}
