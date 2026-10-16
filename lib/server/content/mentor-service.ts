// Mentor content (specs.md §8a.4, Phase 5): a mentor's own material and
// starter templates. The mentor always comes from the session; RLS (0009)
// enforces the same ownership and batch rules.

import { getActor, type Actor } from "@/lib/server/auth/guard";
import { findMyBatchIds } from "@/lib/server/academy-people/repository";
import * as repo from "@/lib/server/content/repository";
import { paged } from "@/lib/server/content/service";
import { canTransition, isContentStatus, validateContentInput, type ContentFieldErrors } from "@/lib/server/content/validation";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import { CONTENT_STATUSES, type ContentAssignment, type ContentCategoryCounts, type ContentInput, type ContentListParams, type ContentListResult, type ContentRecord } from "@/types/content";

type Result<T> = ServiceResult<T> & { fieldErrors?: ContentFieldErrors };

const fail = <T>(code: "validation_error" | "not_found" | "unauthorized", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const NOT_FOUND = "We couldn't find that content.";

async function mentor(): Promise<Actor | null> {
  const actor = await getActor();
  return actor && actor.profile.role === "mentor" ? actor : null;
}

const mine = (actor: Actor): repo.ContentOwner => ({ type: "mentor", id: actor.id });

// Mentor content is always for students, assigned-only (the DB pins it too).
function asMentorInput(input: Partial<Record<keyof ContentInput, unknown>>) {
  return { ...input, targetRole: "student", visibility: "assigned", isTemplate: undefined };
}

export async function getMyContent(params: ContentListParams): Promise<ServiceResult<{ list: ContentListResult; counts: ContentCategoryCounts }>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can view their content.");
  const [list, counts] = await Promise.all([paged(params, { owner: mine(me) }), repo.countByCategory(undefined, mine(me))]);
  if (!list.ok || !list.data) return list as ServiceResult<never>;
  if (counts.error) return mapDbError(counts.error);
  return { ok: true, data: { list: list.data, counts: counts.data } };
}

export async function getMyContentItem(id: string): Promise<ServiceResult<{ content: ContentRecord; assignments: ContentAssignment[]; batches: { id: string; name: string }[] }>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can edit their content.");
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const found = await repo.findContentById(id, mine(me));
  if (found.error) return mapDbError(found.error);
  if (!found.data) return fail("not_found", NOT_FOUND);
  const [assignments, batches] = await Promise.all([repo.findAssignments(id), findMyBatchIds(me.id)]);
  if (assignments.error) return mapDbError(assignments.error);
  if (batches.error) return mapDbError(batches.error);
  return { ok: true, data: { content: found.data, assignments: assignments.data, batches: batches.data } };
}

export async function createMyContent(input: Partial<Record<keyof ContentInput, unknown>>): Promise<Result<{ id: string }>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can create content.");
  const parsed = validateContentInput(asMentorInput(input));
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const created = await repo.insertContent(parsed.value, me.id, mine(me));
  if (created.error) return mapDbError(created.error, "We couldn't save your content. Please try again.");
  return { ok: true, data: created.data };
}

export async function updateMyContent(id: string, input: Partial<Record<keyof ContentInput, unknown>>): Promise<Result<null>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can edit their content.");
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const parsed = validateContentInput(asMentorInput(input));
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const updated = await repo.updateContent(id, parsed.value, me.id, mine(me));
  if (updated.error) return mapDbError(updated.error, "We couldn't save your content. Please try again.");
  if (updated.data === 0) return fail("not_found", NOT_FOUND);
  return { ok: true, data: null };
}

export async function changeMyContentStatus(id: string, status: unknown): Promise<ServiceResult<null>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can change their content.");
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  if (!isContentStatus(status)) return fail("validation_error", "Choose a valid status.");
  const found = await repo.findContentById(id, mine(me));
  if (found.error) return mapDbError(found.error);
  if (!found.data) return fail("not_found", NOT_FOUND);
  if (!canTransition(found.data.status, status)) return fail("validation_error", `Content that is ${CONTENT_STATUSES[found.data.status].toLowerCase()} can't move to ${CONTENT_STATUSES[status].toLowerCase()}.`);
  const updated = await repo.updateContent(id, { status }, me.id, mine(me));
  if (updated.error) return mapDbError(updated.error);
  if (updated.data === 0) return fail("not_found", NOT_FOUND);
  return { ok: true, data: null };
}

// Only batches this mentor teaches (also enforced by RLS in 0009).
export async function assignMyContent(contentId: string, batchId: unknown): Promise<ServiceResult<null>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can assign their content.");
  if (!isUuid(contentId)) return fail("not_found", NOT_FOUND);
  if (!isUuid(batchId)) return fail("validation_error", "Choose one of your batches.");
  const [found, batches] = await Promise.all([repo.findContentById(contentId, mine(me)), findMyBatchIds(me.id)]);
  if (found.error) return mapDbError(found.error);
  if (!found.data) return fail("not_found", NOT_FOUND);
  if (batches.error) return mapDbError(batches.error);
  if (!batches.data.some((b) => b.id === batchId)) return fail("validation_error", "You can only publish to batches you teach.");
  const added = await repo.insertAssignment(contentId, { batchId }, me.id);
  if (added.error) {
    if (added.error.code === "23505") return fail("validation_error", "It's already shared with that batch.");
    return mapDbError(added.error, "We couldn't share it with that batch. Please try again.");
  }
  return { ok: true, data: null };
}

export async function unassignMyContent(contentId: string, assignmentId: string): Promise<ServiceResult<null>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can change their content.");
  if (!isUuid(contentId) || !isUuid(assignmentId)) return fail("not_found", "That batch isn't on this content any more.");
  const owned = await repo.findContentById(contentId, mine(me));
  if (owned.error) return mapDbError(owned.error);
  if (!owned.data) return fail("not_found", NOT_FOUND);
  const removed = await repo.deleteAssignment(contentId, assignmentId);
  if (removed.error) return mapDbError(removed.error);
  if (removed.data === 0) return fail("not_found", "That batch isn't on this content any more.");
  return { ok: true, data: null };
}

// ---- Starter templates -------------------------------------------------------

export async function getTemplates(params: ContentListParams): Promise<ServiceResult<ContentListResult>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can browse templates.");
  return paged(params, { owner: { type: "platform" }, templatesOnly: true, publishedOnly: true });
}

export async function copyTemplate(templateId: string): Promise<ServiceResult<{ id: string }>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can use templates.");
  if (!isUuid(templateId)) return fail("not_found", "We couldn't find that template.");
  const found = await repo.findContentById(templateId, { type: "platform" });
  if (found.error) return mapDbError(found.error);
  const t = found.data;
  if (!t || !t.isTemplate || t.status !== "published") return fail("not_found", "We couldn't find that template.");
  const copy = await repo.insertContent(
    {
      title: t.title,
      description: t.description,
      category: t.category,
      type: t.type,
      difficulty: t.difficulty,
      target_role: "student",
      visibility: "assigned",
      body: t.body,
      external_url: t.externalUrl,
      template_source_id: t.id,
    },
    me.id,
    mine(me),
  );
  if (copy.error) return mapDbError(copy.error, "We couldn't copy the template. Please try again.");
  return { ok: true, data: copy.data };
}
