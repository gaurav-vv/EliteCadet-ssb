// Mentor profile: name (profiles.full_name) + bio and expertise
// (mentor_profiles, 0005). Replaces the old per-browser localStorage copy, so
// a mentor's profile follows their account across devices. RLS
// (mentor_profiles_update_own) limits writes to the mentor's own row; the row
// is created for every mentor by ensure_role_profile.

import { getActor } from "@/lib/server/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import {
  MENTOR_BIO_MAX,
  MENTOR_EXPERTISE_ITEM_MAX,
  MENTOR_EXPERTISE_MAX_ITEMS,
  type MentorProfile,
  type MentorProfileErrors,
  type MentorProfileInput,
} from "@/types/mentor";

/** Pure, so it is unit-testable. */
export function validateMentorProfile(
  raw: Partial<Record<keyof MentorProfileInput, unknown>>,
): { ok: true; value: MentorProfile } | { ok: false; errors: MentorProfileErrors } {
  const errors: MentorProfileErrors = {};
  const fullName = String(raw.fullName ?? "").trim();
  if (fullName.length < 2 || fullName.length > 80) errors.fullName = "Enter your name (2–80 characters).";

  const bio = String(raw.bio ?? "").trim();
  if (bio.length > MENTOR_BIO_MAX) errors.bio = `Keep your bio under ${MENTOR_BIO_MAX} characters.`;

  const seen = new Set<string>();
  const expertise: string[] = [];
  for (const part of String(raw.expertise ?? "").split(",")) {
    const item = part.trim().replace(/\s+/g, " ");
    if (!item || seen.has(item.toLowerCase())) continue;
    seen.add(item.toLowerCase());
    expertise.push(item);
  }
  if (expertise.length > MENTOR_EXPERTISE_MAX_ITEMS) {
    errors.expertise = `List up to ${MENTOR_EXPERTISE_MAX_ITEMS} areas.`;
  } else if (expertise.some((e) => e.length > MENTOR_EXPERTISE_ITEM_MAX)) {
    errors.expertise = `Keep each area under ${MENTOR_EXPERTISE_ITEM_MAX} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { fullName, bio, expertise } };
}

async function mentor() {
  const a = await getActor();
  return a && a.profile.role === "mentor" ? a : null;
}

const notMentor = { ok: false as const, error: { code: "unauthorized" as const, message: "Only a mentor has a mentor profile." } };

export async function getMyMentorProfile(): Promise<ServiceResult<MentorProfile>> {
  const me = await mentor();
  if (!me) return notMentor;
  const supabase = await createClient();
  const { data, error } = await supabase.from("mentor_profiles").select("bio, expertise").eq("user_id", me.id).maybeSingle();
  if (error) return mapDbError(error, "We couldn't load your profile. Please try again.");
  return {
    ok: true,
    data: {
      fullName: me.profile.fullName ?? "",
      bio: typeof data?.bio === "string" ? data.bio : "",
      expertise: Array.isArray(data?.expertise) ? data.expertise.filter((e: unknown): e is string => typeof e === "string") : [],
    },
  };
}

export async function saveMentorProfile(
  raw: Partial<Record<keyof MentorProfileInput, unknown>>,
): Promise<ServiceResult<MentorProfile> & { fieldErrors?: MentorProfileErrors }> {
  const me = await mentor();
  if (!me) return notMentor;
  const parsed = validateMentorProfile(raw);
  if (!parsed.ok) {
    return { ok: false, error: { code: "validation_error", message: "Please fix the highlighted fields." }, fieldErrors: parsed.errors };
  }
  const v = parsed.value;
  const supabase = await createClient();

  // .select() so an RLS-filtered update (0 rows) is caught instead of looking like success.
  const { data, error } = await supabase
    .from("mentor_profiles")
    .update({ bio: v.bio || null, expertise: v.expertise, updated_at: new Date().toISOString() })
    .eq("user_id", me.id)
    .select("user_id");
  if (error) return mapDbError(error, "We couldn't save your profile. Please try again.");
  if (!data || data.length === 0) {
    return { ok: false, error: { code: "server_error", message: "We couldn't save your profile. Please try again." } };
  }

  if (v.fullName !== me.profile.fullName) {
    const { error: nameError } = await supabase.from("profiles").update({ full_name: v.fullName }).eq("id", me.id);
    if (nameError) return mapDbError(nameError, "Your bio was saved, but we couldn't update your name. Please try again.");
  }
  return { ok: true, data: v };
}
