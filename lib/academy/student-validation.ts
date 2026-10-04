import { isUuid } from "@/lib/academy/batch-validation";
import type { StudentFormInput, StudentStatus } from "@/types/academy";

export const STUDENT_NAME_MIN = 2;
export const STUDENT_NAME_MAX = 80;

export function isStudentStatus(value: unknown): value is StudentStatus {
  return value === "active" || value === "inactive";
}

export interface StudentFieldErrors {
  fullName?: string;
  batchId?: string;
  status?: string;
}

export type StudentValidation = { ok: true; value: StudentFormInput } | { ok: false; errors: StudentFieldErrors };

// Single source of truth for student input rules: the dialog uses it for instant
// feedback and the server actions run it again before touching the database
// (never trust the browser). The database enforces the same name length.
export function validateStudentInput(raw: { fullName: string; batchId: string | null; status: string }): StudentValidation {
  const errors: StudentFieldErrors = {};
  const fullName = raw.fullName.trim().replace(/\s+/g, " ");
  const batchId = raw.batchId && raw.batchId !== "none" ? raw.batchId : null;

  if (fullName.length < STUDENT_NAME_MIN) errors.fullName = `Enter the student's full name (at least ${STUDENT_NAME_MIN} characters).`;
  else if (fullName.length > STUDENT_NAME_MAX) errors.fullName = `Name must be ${STUDENT_NAME_MAX} characters or fewer.`;

  if (batchId && !isUuid(batchId)) errors.batchId = "Select a valid batch.";
  if (!isStudentStatus(raw.status)) errors.status = "Select a valid status.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { fullName, batchId, status: raw.status as StudentStatus } };
}
