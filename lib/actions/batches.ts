"use server";

// Batch mutations — REAL Supabase writes (supabase/migrations/0003_batches.sql).
// Every action: (1) confirms the caller is an academy admin, (2) re-validates
// input on the server, (3) writes as the admin's own session so RLS is the
// final gate, (4) reports success only after Postgres confirms the write.
// There is intentionally no delete action: batches are archived (see migration).

import { revalidatePath } from "next/cache";
import { BATCHES_NOT_SET_UP_MESSAGE } from "@/lib/api/batches";
import { isUuid, validateBatchInput, type BatchFieldErrors } from "@/lib/academy/batch-validation";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { BatchFormInput, BatchStatus } from "@/types/academy";

export interface BatchActionError {
  code: "validation_error" | "not_found" | "unauthorized" | "server_error";
  message: string;
  fieldErrors?: BatchFieldErrors;
}

export interface BatchActionResult<T = null> {
  ok: boolean;
  data?: T;
  error?: BatchActionError;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

const fail = (error: BatchActionError): BatchActionResult<never> => ({ ok: false, error });

async function requireAdmin(): Promise<{ supabase: Supabase; academyId: string } | BatchActionResult<never>> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile || profile.role !== "academy_admin" || !profile.academyId) {
    return fail({ code: "unauthorized", message: "Only an academy admin can manage batches." });
  }
  return { supabase: await createClient(), academyId: profile.academyId };
}

function isFailure(value: unknown): value is BatchActionResult<never> {
  return typeof value === "object" && value !== null && "ok" in value;
}

function dbError(error: { code?: string; message?: string }): BatchActionResult<never> {
  if (error.code === "23505") {
    return fail({ code: "validation_error", message: "A batch with this name already exists.", fieldErrors: { name: "A batch with this name already exists." } });
  }
  if (error.code === "PGRST205" || error.code === "42P01") return fail({ code: "server_error", message: BATCHES_NOT_SET_UP_MESSAGE });
  if (error.code === "42501") return fail({ code: "unauthorized", message: "You don't have permission to change this batch." });
  return fail({ code: "server_error", message: "We couldn't save your changes. Please try again." });
}

// The mentor must be a mentor profile in the admin's own academy. (RLS also
// enforces this; checking first gives a clear message instead of a 403.)
async function mentorIsValid(supabase: Supabase, academyId: string, mentorId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", mentorId)
    .eq("role", "mentor")
    .eq("academy_id", academyId)
    .maybeSingle();
  return Boolean(data);
}

function refresh() {
  revalidatePath("/academy/batches");
}

export async function createBatchAction(input: BatchFormInput): Promise<BatchActionResult<{ id: string; name: string }>> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;

  const parsed = validateBatchInput(input);
  if (!parsed.ok) return fail({ code: "validation_error", message: "Please fix the highlighted fields.", fieldErrors: parsed.errors });
  const { name, mentorId, startDate } = parsed.value;

  if (mentorId && !(await mentorIsValid(admin.supabase, admin.academyId, mentorId))) {
    return fail({ code: "validation_error", message: "Select a mentor from your academy.", fieldErrors: { mentorId: "Select a mentor from your academy." } });
  }

  const { data, error } = await admin.supabase
    .from("batches")
    .insert({ academy_id: admin.academyId, name, mentor_id: mentorId, start_date: startDate })
    .select("id, name")
    .single();
  if (error || !data) return dbError(error ?? {});

  refresh();
  return { ok: true, data: { id: data.id as string, name: data.name as string } };
}

export async function updateBatchAction(id: string, input: BatchFormInput): Promise<BatchActionResult> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;
  if (!isUuid(id)) return fail({ code: "not_found", message: "Batch not found." });

  const parsed = validateBatchInput(input);
  if (!parsed.ok) return fail({ code: "validation_error", message: "Please fix the highlighted fields.", fieldErrors: parsed.errors });
  const { name, mentorId, startDate } = parsed.value;

  if (mentorId && !(await mentorIsValid(admin.supabase, admin.academyId, mentorId))) {
    return fail({ code: "validation_error", message: "Select a mentor from your academy.", fieldErrors: { mentorId: "Select a mentor from your academy." } });
  }

  const { data, error } = await admin.supabase
    .from("batches")
    .update({ name, mentor_id: mentorId, start_date: startDate })
    .eq("id", id)
    .eq("academy_id", admin.academyId)
    .select("id");
  if (error) return dbError(error);
  if (!data || data.length === 0) return fail({ code: "not_found", message: "Batch not found." });

  refresh();
  return { ok: true, data: null };
}

// Mentor-only change (the row menu). A single column update: the batch ->
// mentor link is `batches.mentor_id`; nothing else stores it.
export async function setBatchMentorAction(id: string, mentorId: string | null): Promise<BatchActionResult> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;
  if (!isUuid(id)) return fail({ code: "not_found", message: "Batch not found." });
  if (mentorId !== null && !isUuid(mentorId)) return fail({ code: "validation_error", message: "Select a valid mentor." });
  if (mentorId && !(await mentorIsValid(admin.supabase, admin.academyId, mentorId))) {
    return fail({ code: "validation_error", message: "Select a mentor from your academy." });
  }

  const { data, error } = await admin.supabase
    .from("batches")
    .update({ mentor_id: mentorId })
    .eq("id", id)
    .eq("academy_id", admin.academyId)
    .select("id");
  if (error) return dbError(error);
  if (!data || data.length === 0) return fail({ code: "not_found", message: "Batch not found." });

  refresh();
  return { ok: true, data: null };
}

export async function setBatchStatusAction(id: string, status: BatchStatus): Promise<BatchActionResult> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;
  if (!isUuid(id)) return fail({ code: "not_found", message: "Batch not found." });
  if (status !== "active" && status !== "archived") return fail({ code: "validation_error", message: "Invalid status." });

  const { data, error } = await admin.supabase
    .from("batches")
    .update({ status })
    .eq("id", id)
    .eq("academy_id", admin.academyId)
    .select("id");
  if (error) return dbError(error);
  if (!data || data.length === 0) return fail({ code: "not_found", message: "Batch not found." });

  refresh();
  return { ok: true, data: null };
}
