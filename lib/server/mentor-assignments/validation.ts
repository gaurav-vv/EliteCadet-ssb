// Pure rules for assigning students to independent mentors (no I/O; tests/unit/lib/mentor-assignments.test.ts).
// The database enforces the same rules (supabase/migrations/0034_mentor_students.sql); these give a
// plain-language answer before a write is attempted.

export type AssignmentPerson = { role: string; academyId: string | null };
export type AssignmentCheck = { ok: true } | { ok: false; message: string };

export function checkAssignment(mentor: AssignmentPerson | null, student: AssignmentPerson | null): AssignmentCheck {
  if (!mentor || mentor.role !== "mentor") return { ok: false, message: "We couldn't find that mentor." };
  if (mentor.academyId) return { ok: false, message: "This mentor belongs to an academy. Their students come from the academy's batches." };
  if (!student || student.role !== "student") return { ok: false, message: "We couldn't find that student." };
  if (student.academyId) return { ok: false, message: "This student belongs to an academy, so the academy's mentors look after them." };
  return { ok: true };
}

// Postgres error code → message for an assignment write that got past the checks above.
export function assignmentErrorMessage(code: string | undefined): string | null {
  if (code === "23505") return "This student is already assigned to this mentor.";
  if (code === "23514") return "This student can't be assigned to this mentor.";
  return null;
}
