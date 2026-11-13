// Independent-mentor assignments — the only place this module touches Postgres. Runs as the signed-in
// super admin's own session, so RLS (mentor_students_super_all, 0034) is the second guard behind the
// service's permission check. The service-role key is never used here.

import { createClient } from "@/lib/supabase/server";
import { insertAudit, type DbResult } from "@/lib/server/users/repository";
import { sanitizeSearch } from "@/lib/server/users/validation";
import type { AssignedStudent, AssignmentPersonRow, StudentOption } from "@/types/mentor-assignments";

export { insertAudit };

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function findPerson(id: string): Promise<DbResult<AssignmentPersonRow | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, role, academy_id, full_name, email").eq("id", id).maybeSingle();
  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };
  return {
    data: { id: str(data.id), role: str(data.role), academyId: typeof data.academy_id === "string" ? data.academy_id : null, fullName: str(data.full_name), email: typeof data.email === "string" ? data.email : null },
    error: null,
  };
}

// One query: the view joins mentor_students to the student's profile.
export async function findAssigned(mentorId: string): Promise<DbResult<AssignedStudent[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assigned_students")
    .select("id, full_name, email, assigned_at")
    .eq("mentor_id", mentorId)
    .order("full_name", { ascending: true })
    .limit(500);
  if (error) return { data: null, error };
  return {
    data: (data ?? []).flatMap((r) => (typeof r.id === "string" ? [{ id: r.id, fullName: str(r.full_name), email: typeof r.email === "string" ? r.email : null, assignedAt: str(r.assigned_at) }] : [])),
    error: null,
  };
}

// Students who belong to no academy (the only ones an independent mentor may take), minus the ones
// this mentor already has.
export async function searchStudents(q: string, alreadyAssigned: string[]): Promise<DbResult<StudentOption[]>> {
  const supabase = await createClient();
  let query = supabase.from("profiles").select("id, full_name, email").eq("role", "student").is("academy_id", null).eq("status", "active");
  const term = sanitizeSearch(q);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  if (alreadyAssigned.length > 0) query = query.not("id", "in", `(${alreadyAssigned.join(",")})`);
  const { data, error } = await query.order("full_name", { ascending: true }).limit(20);
  if (error) return { data: null, error };
  return { data: (data ?? []).flatMap((r) => (typeof r.id === "string" ? [{ id: r.id, fullName: str(r.full_name), email: typeof r.email === "string" ? r.email : null }] : [])), error: null };
}

export async function insertAssignment(mentorId: string, studentId: string, actorId: string): Promise<DbResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase.from("mentor_students").insert({ mentor_id: mentorId, student_id: studentId, assigned_by: actorId });
  return error ? { data: null, error } : { data: null, error: null };
}

// How many rows were removed, so "not assigned" is distinguishable from success.
export async function deleteAssignment(mentorId: string, studentId: string): Promise<DbResult<number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("mentor_students").delete().eq("mentor_id", mentorId).eq("student_id", studentId).select("student_id");
  if (error) return { data: null, error };
  return { data: data?.length ?? 0, error: null };
}
