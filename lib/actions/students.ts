"use server";

// Academy Student mutations — REAL Supabase writes (migrations/0004_academy_students.sql).
// Every action: (1) confirms the caller is an academy admin, (2) re-validates
// input on the server, (3) writes as the admin's own session so RLS is the final
// gate, (4) reports success only after Postgres confirms the write. The
// database's composite foreign key additionally makes a cross-academy batch
// impossible. Students are identified by UUID, never by name. There is no
// delete: students are marked inactive.

import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/academy/batch-validation";
import { getAdminContext } from "@/lib/academy/admin-context";
import { STUDENTS_NOT_SET_UP_MESSAGE } from "@/lib/api/students";
import { isStudentStatus, validateStudentInput, type StudentFieldErrors } from "@/lib/academy/student-validation";
import { createClient } from "@/lib/supabase/server";
import type { StudentFormInput, StudentStatus } from "@/types/academy";

export interface StudentActionError {
  code: "validation_error" | "not_found" | "unauthorized" | "server_error";
  message: string;
  fieldErrors?: StudentFieldErrors;
}

export interface StudentActionResult<T = null> {
  ok: boolean;
  data?: T;
  error?: StudentActionError;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

const fail = (error: StudentActionError): StudentActionResult<never> => ({ ok: false, error });
const BATCH_ERROR = "Select an active batch from your academy.";

async function requireAdmin(): Promise<{ supabase: Supabase; academyId: string } | StudentActionResult<never>> {
  const admin = await getAdminContext();
  if (!admin) return fail({ code: "unauthorized", message: "Only an academy admin can manage students." });
  return { supabase: await createClient(), academyId: admin.academyId };
}

function isFailure(value: unknown): value is StudentActionResult<never> {
  return typeof value === "object" && value !== null && "ok" in value;
}

function dbError(error: { code?: string; message?: string }): StudentActionResult<never> {
  // 23503: the composite foreign key rejected the batch (not in this academy).
  if (error.code === "23503") return fail({ code: "validation_error", message: BATCH_ERROR, fieldErrors: { batchId: BATCH_ERROR } });
  if (error.code === "PGRST205" || error.code === "42P01") return fail({ code: "server_error", message: STUDENTS_NOT_SET_UP_MESSAGE });
  if (error.code === "42501") return fail({ code: "unauthorized", message: "You don't have permission to change this student." });
  return fail({ code: "server_error", message: "We couldn't save your changes. Please try again." });
}

// The batch must exist in the admin's own academy and be active. (The database
// foreign key independently refuses another academy's batch.)
async function batchIsAssignable(supabase: Supabase, academyId: string, batchId: string): Promise<boolean> {
  const { data } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .eq("academy_id", academyId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}

function refresh(id?: string) {
  revalidatePath("/academy/students");
  revalidatePath("/academy"); // the dashboard shows student counts
  if (id) revalidatePath(`/academy/students/${id}`);
}

export async function createStudentAction(input: StudentFormInput): Promise<StudentActionResult<{ id: string; fullName: string }>> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;

  const parsed = validateStudentInput(input);
  if (!parsed.ok) return fail({ code: "validation_error", message: "Please fix the highlighted fields.", fieldErrors: parsed.errors });
  const { fullName, batchId, status } = parsed.value;

  if (batchId && !(await batchIsAssignable(admin.supabase, admin.academyId, batchId))) {
    return fail({ code: "validation_error", message: BATCH_ERROR, fieldErrors: { batchId: BATCH_ERROR } });
  }

  const { data, error } = await admin.supabase
    .from("academy_students")
    .insert({ academy_id: admin.academyId, full_name: fullName, batch_id: batchId, status })
    .select("id, full_name")
    .single();
  if (error || !data) return dbError(error ?? {});

  refresh();
  return { ok: true, data: { id: data.id as string, fullName: data.full_name as string } };
}

export async function updateStudentAction(id: string, input: StudentFormInput): Promise<StudentActionResult> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;
  if (!isUuid(id)) return fail({ code: "not_found", message: "Student not found." });

  const parsed = validateStudentInput(input);
  if (!parsed.ok) return fail({ code: "validation_error", message: "Please fix the highlighted fields.", fieldErrors: parsed.errors });
  const { fullName, batchId, status } = parsed.value;

  // Moving to a different batch needs an active batch; leaving a student in the
  // batch they already have (even if it was archived since) is always allowed.
  if (batchId) {
    const { data: current } = await admin.supabase
      .from("academy_students")
      .select("batch_id")
      .eq("id", id)
      .eq("academy_id", admin.academyId)
      .maybeSingle();
    if (!current) return fail({ code: "not_found", message: "Student not found." });
    if (current.batch_id !== batchId && !(await batchIsAssignable(admin.supabase, admin.academyId, batchId))) {
      return fail({ code: "validation_error", message: BATCH_ERROR, fieldErrors: { batchId: BATCH_ERROR } });
    }
  }

  const { data, error } = await admin.supabase
    .from("academy_students")
    .update({ full_name: fullName, batch_id: batchId, status })
    .eq("id", id)
    .eq("academy_id", admin.academyId)
    .select("id");
  if (error) return dbError(error);
  if (!data || data.length === 0) return fail({ code: "not_found", message: "Student not found." });

  refresh(id);
  return { ok: true, data: null };
}

// Row-menu shortcut: batch only.
export async function setStudentBatchAction(id: string, batchId: string | null): Promise<StudentActionResult> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;
  if (!isUuid(id)) return fail({ code: "not_found", message: "Student not found." });
  if (batchId !== null && !isUuid(batchId)) return fail({ code: "validation_error", message: "Select a valid batch." });
  if (batchId && !(await batchIsAssignable(admin.supabase, admin.academyId, batchId))) {
    return fail({ code: "validation_error", message: BATCH_ERROR, fieldErrors: { batchId: BATCH_ERROR } });
  }

  const { data, error } = await admin.supabase
    .from("academy_students")
    .update({ batch_id: batchId })
    .eq("id", id)
    .eq("academy_id", admin.academyId)
    .select("id");
  if (error) return dbError(error);
  if (!data || data.length === 0) return fail({ code: "not_found", message: "Student not found." });

  refresh(id);
  return { ok: true, data: null };
}

// Row-menu shortcut: status only.
export async function setStudentStatusAction(id: string, status: StudentStatus): Promise<StudentActionResult> {
  const admin = await requireAdmin();
  if (isFailure(admin)) return admin;
  if (!isUuid(id)) return fail({ code: "not_found", message: "Student not found." });
  if (!isStudentStatus(status)) return fail({ code: "validation_error", message: "Invalid status." });

  const { data, error } = await admin.supabase
    .from("academy_students")
    .update({ status })
    .eq("id", id)
    .eq("academy_id", admin.academyId)
    .select("id");
  if (error) return dbError(error);
  if (!data || data.length === 0) return fail({ code: "not_found", message: "Student not found." });

  refresh(id);
  return { ok: true, data: null };
}
