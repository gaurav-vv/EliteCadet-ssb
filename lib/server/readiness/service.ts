// Readiness profile service (T104). One SQL function (0020) checks access —
// the student, their mentors, their academy's admins, super admins — and
// returns numbers only; states come from compute.ts.

import { getActor } from "@/lib/server/auth/guard";
import { buildReadiness, toSignals } from "@/lib/server/readiness/compute";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import type { ReadinessProfile } from "@/types/readiness";

async function load(studentId: string, nowIso: string, audience: "student" | "mentor" | "academy"): Promise<ServiceResult<ReadinessProfile>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("readiness_signals", { p_student: studentId });
  if (error?.code === "42501") return { ok: false, error: { code: "not_found", message: "That student isn't available." } };
  if (error) return mapDbError(error, "We couldn't load the readiness profile. Please try again.");
  return { ok: true, data: buildReadiness(toSignals(data), nowIso, audience) };
}

export async function getMyReadiness(nowIso: string): Promise<ServiceResult<ReadinessProfile>> {
  const me = await getActor();
  if (!me || me.profile.role !== "student") return { ok: false, error: { code: "unauthorized", message: "Only a student has a readiness profile." } };
  return load(me.id, nowIso, "student");
}

/** Mentors get evidence; academy admins get states only. Access is decided by the database. */
export async function getStudentReadiness(studentId: string, nowIso: string): Promise<ServiceResult<ReadinessProfile>> {
  const me = await getActor();
  if (!me || !["mentor", "academy_admin", "super_admin"].includes(me.profile.role)) return { ok: false, error: { code: "unauthorized", message: "You can't view this profile." } };
  if (!isUuid(studentId)) return { ok: false, error: { code: "not_found", message: "That student isn't available." } };
  return load(studentId, nowIso, me.profile.role === "mentor" ? "mentor" : "academy");
}
