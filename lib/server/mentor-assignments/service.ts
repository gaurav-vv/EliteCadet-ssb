// Assigning students to independent mentors — super admin only (permission mentors.assign_students).
// Rules, authorization and audit live here; pages and Server Actions call it, it calls the repository.

import { authorize, isGuardFailure } from "@/lib/server/auth/guard";
import * as repo from "@/lib/server/mentor-assignments/repository";
import { assignmentErrorMessage, checkAssignment } from "@/lib/server/mentor-assignments/validation";
import { mapDbError, type ServiceErrorCode, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type { AssignedStudent, StudentOption } from "@/types/mentor-assignments";

const fail = <T>(code: ServiceErrorCode, message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });

export async function getMentorAssignments(mentorId: string): Promise<ServiceResult<AssignedStudent[]>> {
  const actor = await authorize("mentors.assign_students");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(mentorId)) return fail("not_found", "We couldn't find that mentor.");
  const found = await repo.findAssigned(mentorId);
  if (found.error) return mapDbError(found.error, "We couldn't load this mentor's students. Please try again.");
  return { ok: true, data: found.data };
}

export async function searchAssignableStudents(mentorId: string, q: string): Promise<ServiceResult<StudentOption[]>> {
  const actor = await authorize("mentors.assign_students");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(mentorId)) return fail("not_found", "We couldn't find that mentor.");
  const assigned = await repo.findAssigned(mentorId);
  if (assigned.error) return mapDbError(assigned.error, "We couldn't search students. Please try again.");
  const found = await repo.searchStudents(typeof q === "string" ? q : "", assigned.data.map((s) => s.id));
  if (found.error) return mapDbError(found.error, "We couldn't search students. Please try again.");
  return { ok: true, data: found.data };
}

export async function assignStudent(mentorId: string, studentId: string): Promise<ServiceResult<{ studentName: string }>> {
  const actor = await authorize("mentors.assign_students");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(mentorId) || !isUuid(studentId)) return fail("validation_error", "Choose a student to assign.");
  const [mentor, student] = await Promise.all([repo.findPerson(mentorId), repo.findPerson(studentId)]);
  const lookupError = mentor.error ?? student.error;
  if (lookupError) return mapDbError(lookupError, "We couldn't assign the student. Please try again.");
  const checked = checkAssignment(mentor.data, student.data);
  if (!checked.ok) return fail("validation_error", checked.message);

  const inserted = await repo.insertAssignment(mentorId, studentId, actor.id);
  if (inserted.error) {
    // The primary key makes a duplicate (or a concurrent double click) fail here, never create a second row.
    const message = assignmentErrorMessage(inserted.error.code);
    return message ? fail("validation_error", message) : mapDbError(inserted.error, "We couldn't assign the student. Please try again.");
  }
  const name = student.data?.fullName || student.data?.email || "The student";
  await repo.insertAudit({ actorId: actor.id, action: "mentor.student_assigned", targetType: "user", targetId: mentorId, details: { summary: `Assigned ${name} to an independent mentor`, studentId } });
  return { ok: true, data: { studentName: name } };
}

export async function unassignStudent(mentorId: string, studentId: string): Promise<ServiceResult<null>> {
  const actor = await authorize("mentors.assign_students");
  if (isGuardFailure(actor)) return actor;
  if (!isUuid(mentorId) || !isUuid(studentId)) return fail("validation_error", "Choose a student to remove.");
  const removed = await repo.deleteAssignment(mentorId, studentId);
  if (removed.error) return mapDbError(removed.error, "We couldn't remove the student. Please try again.");
  if (removed.data === 0) return fail("not_found", "This student isn't assigned to this mentor.");
  await repo.insertAudit({ actorId: actor.id, action: "mentor.student_unassigned", targetType: "user", targetId: mentorId, details: { summary: "Removed a student from an independent mentor", studentId } });
  return { ok: true, data: null };
}
