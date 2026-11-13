// A mentor's own profile, stored in the database (profiles.full_name / phone, mentor_profiles.bio /
// qualifications / expertise). Both mentor types use it. Runs as the mentor's own session, so RLS
// (mentor_profiles_own / mentor_profiles_update_own, 0005) is the second guard.

import { getActor } from "@/lib/server/auth/guard";
import { checkMentorProfileInput, type MentorProfileField } from "@/lib/server/mentor-profile/validation";
import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "@/lib/server/users/service";

export interface MentorProfileRecord {
  fullName: string;
  phone: string | null;
  bio: string | null;
  qualifications: string | null;
  specialization: string[];
}

type Failure = ServiceResult<never> & { field?: MentorProfileField };
const fail = (code: "unauthorized" | "validation_error" | "server_error", message: string, field?: MentorProfileField): Failure => ({ ok: false, error: { code, message }, field });

export async function getMyMentorProfile(): Promise<ServiceResult<MentorProfileRecord>> {
  const actor = await getActor();
  if (!actor || actor.profile.role !== "mentor") return fail("unauthorized", "Only a mentor has this profile.");
  const supabase = await createClient();
  const [base, extra] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", actor.id).maybeSingle(),
    supabase.from("mentor_profiles").select("bio, qualifications, expertise").eq("user_id", actor.id).maybeSingle(),
  ]);
  if (base.error || extra.error) return fail("server_error", "We couldn't load your profile. Please try again.");
  return {
    ok: true,
    data: {
      fullName: typeof base.data?.full_name === "string" ? base.data.full_name : "",
      phone: typeof base.data?.phone === "string" ? base.data.phone : null,
      bio: typeof extra.data?.bio === "string" ? extra.data.bio : null,
      qualifications: typeof extra.data?.qualifications === "string" ? extra.data.qualifications : null,
      specialization: Array.isArray(extra.data?.expertise) ? extra.data.expertise.filter((e: unknown): e is string => typeof e === "string") : [],
    },
  };
}

export async function saveMyMentorProfile(input: { fullName?: unknown; phone?: unknown; bio?: unknown; qualifications?: unknown; specialization?: unknown }): Promise<ServiceResult<MentorProfileRecord> & { field?: MentorProfileField }> {
  const actor = await getActor();
  if (!actor || actor.profile.role !== "mentor") return fail("unauthorized", "Only a mentor can edit this profile.");
  const checked = checkMentorProfileInput(input);
  if (!checked.ok) return fail("validation_error", checked.message, checked.field);
  const v = checked.values;

  const supabase = await createClient();
  const [base, extra] = await Promise.all([
    supabase.from("profiles").update({ full_name: v.fullName, phone: v.phone }).eq("id", actor.id).select("id"),
    supabase.from("mentor_profiles").update({ bio: v.bio, qualifications: v.qualifications, expertise: v.specialization }).eq("user_id", actor.id).select("user_id"),
  ]);
  // An update that matched no row means RLS or a missing mentor_profiles row: never report it as saved.
  if (base.error || extra.error || !base.data?.length || !extra.data?.length) {
    return fail("server_error", "We couldn't save your profile. Please try again.");
  }
  return { ok: true, data: { fullName: v.fullName, phone: v.phone, bio: v.bio, qualifications: v.qualifications, specialization: v.specialization } };
}
