"use server";

// Batch mutations — REAL Supabase writes (supabase/migrations/0003_batches.sql).
// Every action: (1) confirms the caller is an academy admin, (2) re-validates
// input on the server, (3) writes as the admin's own session so RLS is the
// final gate, (4) reports success only after Postgres confirms the write.
// There is intentionally no delete action: batches are archived (see 0003).

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

async function requireAdmin(): Promise<{ supabase: Supabase; academyId: string; userId: string } | BatchActionResult<never>> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile || profile.role !== "academy_admin" || !profile.academyId || profile.status !== "active") {
    return fail({ code: "unauthorized", message: "Only an academy admin can manage batches." });
  }
  return { supabase: await createClient(), academyId: profile.academyId, userId: profile.id };
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

// The mentor must be a mentor profile in the admin's own academy. (The 0007
// trigger also enforces this; checking first gives a clear message.)
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
  const { name, startDate } = parsed.value;

  const { data, error } = await admin.supabase
    .from("batches")
    .insert({ academy_id: admin.academyId, name, start_date: startDate })
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
  const { name, startDate } = parsed.value;

  const { data, error } = await admin.supabase
    .from("batches")
    .update({ name, start_date: startDate })
    .eq("id", id)
    .eq("academy_id", admin.academyId)
    .select("id");
  if (error) return dbError(error);
  if (!data || data.length === 0) return fail({ code: "not_found", message: "Batch not found." });

  refresh();
  return { ok: true, data: null };
}

// Batch membership — batch_mentors / batch_students (0007). The database also
// enforces role + same-academy (trigger) and academy scope (RLS); the checks
// here give a clear message first.

async function batchInAcademy(supabase: Supabase, academyId: string, batchId: string): Promise<boolean> {
  const { data } = await supabase.from("batches").select("id").eq("id", batchId).eq("academy_id", academyId).maybeSingle();
  return Boolean(data);
}

async function studentIsValid(supabase: Supabase, academyId: string, studentId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("id").eq("id", studentId).eq("role", "student").eq("academy_id", academyId).maybeSingle();
  return Boolean(data);
}

function membershipError(error: { code?: string; message?: string }): BatchActionResult<never> {
  if (error.code === "23514") return fail({ code: "validation_error", message: "That person isn't eligible for this batch." });
  if (error.code === "23505") return fail({ code: "validation_error", message: "They're already on this batch." });
  return dbError(error);
}

function refreshBatch(batchId: string) {
  revalidatePath("/academy/batches");
  revalidatePath(`/academy/batches/${batchId}`);
  revalidatePath("/academy/students");
  revalidatePath("/academy/mentors");
}

export async function addBatchMentorAction(batchId: string, mentorId: string): Promise<BatchActionResult> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;
  if (!isUuid(batchId) || !isUuid(mentorId)) return fail({ code: "validation_error", message: "Select a valid mentor." });
  if (!(await batchInAcademy(admin.supabase, admin.academyId, batchId))) return fail({ code: "not_found", message: "Batch not found." });
  if (!(await mentorIsValid(admin.supabase, admin.academyId, mentorId))) return fail({ code: "validation_error", message: "Select a mentor from your academy." });

  const { error } = await admin.supabase.from("batch_mentors").insert({ batch_id: batchId, mentor_id: mentorId, assigned_by: admin.userId });
  if (error) return membershipError(error);
  refreshBatch(batchId);
  return { ok: true, data: null };
}

export async function removeBatchMentorAction(batchId: string, mentorId: string): Promise<BatchActionResult> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;
  if (!isUuid(batchId) || !isUuid(mentorId)) return fail({ code: "not_found", message: "Mentor not found on this batch." });

  const { data, error } = await admin.supabase.from("batch_mentors").delete().eq("batch_id", batchId).eq("mentor_id", mentorId).select("mentor_id");
  if (error) return dbError(error);
  if (!data || data.length === 0) return fail({ code: "not_found", message: "Mentor not found on this batch." });
  refreshBatch(batchId);
  return { ok: true, data: null };
}

// A student is in at most one batch: adding moves them from any other batch.
export async function setStudentBatchAction(studentId: string, batchId: string | null): Promise<BatchActionResult> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;
  if (!isUuid(studentId) || (batchId !== null && !isUuid(batchId))) return fail({ code: "validation_error", message: "Select a valid batch." });
  if (!(await studentIsValid(admin.supabase, admin.academyId, studentId))) return fail({ code: "not_found", message: "Student not found in your academy." });

  if (batchId === null) {
    const { error } = await admin.supabase.from("batch_students").delete().eq("student_id", studentId);
    if (error) return dbError(error);
  } else {
    if (!(await batchInAcademy(admin.supabase, admin.academyId, batchId))) return fail({ code: "not_found", message: "Batch not found." });
    const { error } = await admin.supabase
      .from("batch_students")
      .upsert({ batch_id: batchId, student_id: studentId, added_by: admin.userId }, { onConflict: "student_id" });
    if (error) return membershipError(error);
    refreshBatch(batchId);
  }
  revalidatePath("/academy/students");
  revalidatePath(`/academy/students/${studentId}`);
  revalidatePath("/academy/batches", "layout");
  return { ok: true, data: null };
}

// The batch page's "Add student": batch first so it can be .bind()-ed.
export async function addStudentToBatchAction(batchId: string, studentId: string): Promise<BatchActionResult> {
  return setStudentBatchAction(studentId, batchId);
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
