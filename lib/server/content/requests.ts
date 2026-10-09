// Content requests (specs.md §8a.4, Phase 5): mentors ask the platform team to
// create content; a super admin quotes a fee. The fee is recorded as owed and
// settled OUTSIDE the app — nothing here charges anyone. Mentor-side
// transitions go through database functions that enforce the lifecycle.

import { authorize, getActor, isGuardFailure, type Actor } from "@/lib/server/auth/guard";
import { canStaffMove, isCategory, isContentType, parseFee, validateRequestInput, type RequestFieldErrors } from "@/lib/server/content/validation";
import { createClient } from "@/lib/supabase/server";
import { insertAudit, type DbError } from "@/lib/server/users/repository";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type { ContentRequest, ContentRequestInput, ContentRequestStatus, SettlementStatus } from "@/types/content";

const fail = <T>(code: "validation_error" | "not_found" | "unauthorized", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const NOT_FOUND = "We couldn't find that request.";

const COLUMNS =
  "id, mentor_id, title, details, category, type, needed_by, status, quoted_fee_inr, quote_note, delivered_content_id, settlement, created_at, updated_at, mentor:profiles!content_requests_mentor_id_fkey(full_name), academy:academies(name)";

const STATUSES: ContentRequestStatus[] = ["requested", "quoted", "accepted", "declined", "in_progress", "delivered", "cancelled"];
const SETTLEMENTS: SettlementStatus[] = ["not_due", "owed", "settled"];

export function toRequest(row: unknown): ContentRequest | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.mentor_id !== "string" || typeof r.title !== "string" || typeof r.created_at !== "string") return null;
  if (!isCategory(r.category) || !isContentType(r.type) || !STATUSES.includes(r.status as ContentRequestStatus)) return null;
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as Record<string, unknown> | null | undefined;
  const fee = r.quoted_fee_inr === null || r.quoted_fee_inr === undefined ? null : Number(r.quoted_fee_inr);
  return {
    id: r.id,
    mentorId: r.mentor_id,
    mentorName: typeof one(r.mentor)?.full_name === "string" ? (one(r.mentor)!.full_name as string) : null,
    academyName: typeof one(r.academy)?.name === "string" ? (one(r.academy)!.name as string) : null,
    title: r.title,
    details: typeof r.details === "string" ? r.details : "",
    category: r.category,
    type: r.type,
    neededBy: typeof r.needed_by === "string" ? r.needed_by : null,
    status: r.status as ContentRequestStatus,
    quotedFeeInr: fee !== null && Number.isFinite(fee) ? fee : null,
    quoteNote: typeof r.quote_note === "string" ? r.quote_note : null,
    deliveredContentId: typeof r.delivered_content_id === "string" ? r.delivered_content_id : null,
    settlement: SETTLEMENTS.includes(r.settlement as SettlementStatus) ? (r.settlement as SettlementStatus) : "not_due",
    createdAt: r.created_at,
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : r.created_at,
  };
}

async function mentor(): Promise<Actor | null> {
  const actor = await getActor();
  return actor && actor.profile.role === "mentor" ? actor : null;
}

function rpcError(error: DbError, fallback: string): ServiceResult<never> {
  if (error.code === "P0002") return fail("validation_error", fallback);
  return mapDbError(error);
}

// ---- Mentor -----------------------------------------------------------------

export async function createRequest(input: Partial<Record<keyof ContentRequestInput, unknown>>, today: string): Promise<ServiceResult<{ id: string }> & { fieldErrors?: RequestFieldErrors }> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can request content.");
  const parsed = validateRequestInput(input, today);
  if (!parsed.ok) return { ...fail("validation_error", "Please fix the highlighted fields."), fieldErrors: parsed.errors };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_requests")
    .insert({ ...parsed.value, mentor_id: me.id, academy_id: me.profile.academyId })
    .select("id")
    .single();
  if (error || !data) return mapDbError(error ?? {}, "We couldn't send your request. Please try again.");
  return { ok: true, data: { id: data.id as string } };
}

export async function getMyRequests(): Promise<ServiceResult<ContentRequest[]>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only a mentor can view their requests.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("content_requests").select(COLUMNS).eq("mentor_id", me.id).order("created_at", { ascending: false }).limit(200);
  if (error) return mapDbError(error, "We couldn't load your requests. Please try again.");
  return { ok: true, data: (data ?? []).map(toRequest).filter((r): r is ContentRequest => r !== null) };
}

export async function respondToQuote(id: string, accept: boolean): Promise<ServiceResult<null>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only the requesting mentor can respond.");
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_content_quote", { p_request: id, p_accept: accept });
  if (error) return rpcError(error, "This request isn't waiting for your answer.");
  return { ok: true, data: null };
}

export async function cancelRequest(id: string): Promise<ServiceResult<null>> {
  const me = await mentor();
  if (!me) return fail("unauthorized", "Only the requesting mentor can cancel.");
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_content_request", { p_request: id });
  if (error) return rpcError(error, "This request can no longer be cancelled.");
  return { ok: true, data: null };
}

// ---- Super Admin --------------------------------------------------------------

export async function getAllRequests(status: string): Promise<ServiceResult<ContentRequest[]>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  const supabase = await createClient();
  let query = supabase.from("content_requests").select(COLUMNS).order("created_at", { ascending: false }).limit(200);
  if (STATUSES.includes(status as ContentRequestStatus)) query = query.eq("status", status);
  else if (status === "owed") query = query.eq("settlement", "owed");
  const { data, error } = await query;
  if (error) return mapDbError(error, "We couldn't load requests. Please try again.");
  return { ok: true, data: (data ?? []).map(toRequest).filter((r): r is ContentRequest => r !== null) };
}

async function staffLoad(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("content_requests").select(COLUMNS).eq("id", id).maybeSingle();
  return { supabase, request: data ? toRequest(data) : null, error };
}

export async function quoteRequest(id: string, fee: unknown, note: unknown): Promise<ServiceResult<null>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const amount = parseFee(fee);
  if (amount === null) return fail("validation_error", "Enter a fee in rupees, like 1500 or 1500.50.");
  const quoteNote = typeof note === "string" ? note.trim().slice(0, 500) : "";
  const { supabase, request, error } = await staffLoad(id);
  if (error) return mapDbError(error);
  if (!request) return fail("not_found", NOT_FOUND);
  if (!canStaffMove(request.status, "quoted")) return fail("validation_error", "Only a new or quoted request can be quoted.");
  const { error: upd } = await supabase
    .from("content_requests")
    .update({ status: "quoted", quoted_fee_inr: amount, quote_note: quoteNote || null, quoted_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["requested", "quoted"]);
  if (upd) return mapDbError(upd);
  await insertAudit({ actorId: actor.id, action: "content_request.quoted", targetType: "content_request", targetId: id, details: { summary: `Quoted ₹${amount}`, fee: amount } });
  return { ok: true, data: null };
}

export async function startRequest(id: string): Promise<ServiceResult<null>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const { supabase, request, error } = await staffLoad(id);
  if (error) return mapDbError(error);
  if (!request) return fail("not_found", NOT_FOUND);
  if (!canStaffMove(request.status, "in_progress")) return fail("validation_error", "Only an accepted request can be started.");
  const { error: upd } = await supabase.from("content_requests").update({ status: "in_progress" }).eq("id", id).eq("status", "accepted");
  if (upd) return mapDbError(upd);
  return { ok: true, data: null };
}

export async function deliverRequest(id: string, contentId: unknown): Promise<ServiceResult<{ contentId: string }>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  if (!isUuid(contentId)) return fail("validation_error", "Choose the content to deliver.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deliver_content_request", { p_request: id, p_content: contentId });
  if (error) return rpcError(error, "Only an accepted request can be delivered, with platform content.");
  return { ok: true, data: { contentId: String(data) } };
}

export async function markSettled(id: string): Promise<ServiceResult<null>> {
  const actor = await authorize("content.manage");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(id)) return fail("not_found", NOT_FOUND);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_requests")
    .update({ settlement: "settled", settled_at: new Date().toISOString(), settled_by: actor.id })
    .eq("id", id)
    .eq("settlement", "owed")
    .select("id");
  if (error) return mapDbError(error);
  if (!data || data.length === 0) return fail("validation_error", "Only an owed fee can be marked settled.");
  await insertAudit({ actorId: actor.id, action: "content_request.settled", targetType: "content_request", targetId: id, details: { summary: "Fee marked settled (deducted outside the app)" } });
  return { ok: true, data: null };
}
