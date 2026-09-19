"use server";

// Server Actions — see lib/actions/mentor.ts for why mutations here can't be
// plain functions called from Client Components. Mutates the mock,
// in-memory "backend" state in lib/mock/academy.ts (resets on server
// restart — status.md, 2026-09-19).

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  BATCHES,
  MENTORS,
  SETTINGS,
  STUDENTS,
  clearAcademyDemoData,
  getBatch,
  getStudent,
  resetAcademyDemoData,
} from "@/lib/mock/academy";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import type {
  AcademyBatch,
  AcademyMentor,
  AcademySettings,
  AcademyStudent,
  BatchInput,
  MentorInviteInput,
  StudentInput,
} from "@/types/academy";

export interface ActionError {
  code: "validation_error" | "not_found";
  message: string;
}

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: ActionError;
}

function isDuplicateName(fullName: string): boolean {
  return STUDENTS.some((s) => s.fullName.trim().toLowerCase() === fullName.trim().toLowerCase());
}

export async function addStudentAction(input: StudentInput): Promise<ActionResult<AcademyStudent>> {
  if (!input.fullName.trim()) {
    return { ok: false, error: { code: "validation_error", message: "A name is required." } };
  }
  if (isDuplicateName(input.fullName)) {
    return { ok: false, error: { code: "validation_error", message: "A student with this name already exists." } };
  }
  if (input.batchId && !getBatch(input.batchId)) {
    return { ok: false, error: { code: "validation_error", message: "Select a valid batch." } };
  }

  const student: AcademyStudent = {
    id: `stu-${Date.now()}`,
    fullName: input.fullName.trim(),
    batchId: input.batchId,
    mentorId: input.batchId ? (getBatch(input.batchId)?.mentorId ?? null) : null,
    status: "active",
    readiness: null,
    lastActivityAt: null,
  };
  STUDENTS.push(student);
  if (input.batchId) {
    getBatch(input.batchId)?.studentIds.push(student.id);
  }

  revalidatePath("/academy");
  revalidatePath("/academy/students");
  return { ok: true, data: student };
}

export async function setStudentStatusAction(id: string, status: "active" | "inactive"): Promise<ActionResult<null>> {
  const student = getStudent(id);
  if (!student) return { ok: false, error: { code: "not_found", message: "Student not found." } };
  student.status = status;

  revalidatePath("/academy");
  revalidatePath("/academy/students");
  revalidatePath(`/academy/students/${id}`);
  return { ok: true, data: null };
}

export async function assignStudentBatchAction(studentId: string, batchId: string | null): Promise<ActionResult<null>> {
  const student = getStudent(studentId);
  if (!student) return { ok: false, error: { code: "not_found", message: "Student not found." } };
  if (batchId && !getBatch(batchId)) {
    return { ok: false, error: { code: "validation_error", message: "Select a valid batch." } };
  }

  if (student.batchId) {
    const oldBatch = getBatch(student.batchId);
    if (oldBatch) oldBatch.studentIds = oldBatch.studentIds.filter((id) => id !== studentId);
  }
  student.batchId = batchId;
  if (batchId) {
    const newBatch = getBatch(batchId)!;
    if (!newBatch.studentIds.includes(studentId)) newBatch.studentIds.push(studentId);
    student.mentorId = newBatch.mentorId;
  } else {
    student.mentorId = null;
  }

  revalidatePath("/academy");
  revalidatePath("/academy/students");
  revalidatePath("/academy/batches");
  revalidatePath(`/academy/students/${studentId}`);
  return { ok: true, data: null };
}

export async function createBatchAction(input: BatchInput): Promise<ActionResult<AcademyBatch>> {
  if (!input.name.trim()) {
    return { ok: false, error: { code: "validation_error", message: "A batch name is required." } };
  }
  const batch: AcademyBatch = { id: `batch-${Date.now()}`, name: input.name.trim(), mentorId: null, studentIds: [] };
  BATCHES.push(batch);

  revalidatePath("/academy");
  revalidatePath("/academy/batches");
  return { ok: true, data: batch };
}

export async function assignBatchMentorAction(batchId: string, mentorId: string | null): Promise<ActionResult<null>> {
  const batch = getBatch(batchId);
  if (!batch) return { ok: false, error: { code: "not_found", message: "Batch not found." } };
  batch.mentorId = mentorId;
  for (const studentId of batch.studentIds) {
    const student = getStudent(studentId);
    if (student) student.mentorId = mentorId;
  }

  revalidatePath("/academy");
  revalidatePath("/academy/batches");
  revalidatePath(`/academy/batches/${batchId}`);
  revalidatePath("/academy/students");
  return { ok: true, data: null };
}

export async function removeStudentFromBatchAction(batchId: string, studentId: string): Promise<ActionResult<null>> {
  return assignStudentBatchAction(studentId, null).then((result) => {
    if (!result.ok) return result;
    revalidatePath(`/academy/batches/${batchId}`);
    return result;
  });
}

function isDuplicateMentorEmail(email: string): boolean {
  return MENTORS.some((m) => m.email.trim().toLowerCase() === email.trim().toLowerCase());
}

// Real invite: creates an actual Supabase auth user via the admin API (the
// anon key cannot do this — service_role only) and emails them a link to
// set a password. The trigger in supabase/migrations/0001_init_auth.sql
// reads the role/full_name/academy_id passed here to create their profile
// automatically. The mock MENTORS array is also updated so the existing
// mock-backed dashboard/list/batch-assignment UI reflects the new mentor
// immediately — the rest of the academy domain (students, batches) hasn't
// migrated to real Postgres tables yet (status.md, 2026-09-19), so this is a
// deliberate bridge, not an oversight.
export async function inviteMentorAction(input: MentorInviteInput): Promise<ActionResult<AcademyMentor>> {
  if (!input.fullName.trim()) {
    return { ok: false, error: { code: "validation_error", message: "A name is required." } };
  }
  if (!input.email.trim() || !input.email.includes("@")) {
    return { ok: false, error: { code: "validation_error", message: "Enter a valid email." } };
  }
  if (isDuplicateMentorEmail(input.email)) {
    return { ok: false, error: { code: "validation_error", message: "A mentor with this email already exists." } };
  }

  const { profile } = await getCurrentUserAndProfile();
  if (!profile || profile.role !== "academy_admin") {
    return { ok: false, error: { code: "validation_error", message: "Only an academy admin can invite mentors." } };
  }

  const headerList = await headers();
  const origin = `${headerList.get("x-forwarded-proto") ?? "http"}://${headerList.get("host")}`;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email.trim(), {
    data: {
      full_name: input.fullName.trim(),
      role: "mentor",
      academy_id: profile.academyId,
    },
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error || !data.user) {
    return { ok: false, error: { code: "validation_error", message: error?.message ?? "We couldn't send the invite. Please try again." } };
  }

  const mentor: AcademyMentor = {
    id: data.user.id,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    status: "invited",
    sessionsThisWeek: 0,
    pendingEvaluations: 0,
  };
  MENTORS.push(mentor);

  revalidatePath("/academy");
  revalidatePath("/academy/mentors");
  return { ok: true, data: mentor };
}

export async function loadDemoDataAction(): Promise<ActionResult<null>> {
  resetAcademyDemoData();
  revalidatePath("/academy");
  revalidatePath("/academy/students");
  revalidatePath("/academy/batches");
  revalidatePath("/academy/mentors");
  revalidatePath("/academy/reports");
  revalidatePath("/academy/settings");
  return { ok: true, data: null };
}

export async function clearDemoDataAction(): Promise<ActionResult<null>> {
  clearAcademyDemoData();
  revalidatePath("/academy");
  revalidatePath("/academy/students");
  revalidatePath("/academy/batches");
  revalidatePath("/academy/mentors");
  revalidatePath("/academy/reports");
  return { ok: true, data: null };
}

export async function updateSettingsAction(input: AcademySettings): Promise<ActionResult<AcademySettings>> {
  if (!input.academyName.trim()) {
    return { ok: false, error: { code: "validation_error", message: "Academy name is required." } };
  }
  SETTINGS.academyName = input.academyName.trim();
  SETTINGS.contactEmail = input.contactEmail.trim();
  SETTINGS.adminName = input.adminName.trim();

  revalidatePath("/academy");
  revalidatePath("/academy/settings");
  return { ok: true, data: { ...SETTINGS } };
}
