// Student preparation preferences (T105). Saved through
// save_student_preferences (0021), which re-checks the role and the date.

import { getActor } from "@/lib/server/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { ENTRY_SCHEMES, PREPARATION_STAGES, STUDY_MINUTES, type EntryScheme, type PreferencesInput, type PreparationStage, type StudentPreferences } from "@/types/student";

export type PreferenceErrors = Partial<Record<keyof PreferencesInput, string>>;

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

/** Pure: validates against IST "today" passed in, so it is testable. */
export function validatePreferences(raw: Partial<Record<keyof PreferencesInput, unknown>>, todayIst: string): { ok: true; value: PreferencesInput } | { ok: false; errors: PreferenceErrors } {
  const errors: PreferenceErrors = {};
  const fullName = String(raw.fullName ?? "").trim();
  if (fullName.length < 2 || fullName.length > 80) errors.fullName = "Enter your name (2–80 characters).";
  const entryScheme = raw.entryScheme ? String(raw.entryScheme) : null;
  if (!entryScheme || !(entryScheme in ENTRY_SCHEMES)) errors.entryScheme = "Choose the entry you're preparing for.";
  const preparationStage = raw.preparationStage ? String(raw.preparationStage) : null;
  if (!preparationStage || !(preparationStage in PREPARATION_STAGES)) errors.preparationStage = "Choose where you are in your preparation.";
  const date = raw.targetSsbDate ? String(raw.targetSsbDate) : "";
  if (date) {
    const limit = new Date(`${todayIst}T00:00:00Z`);
    limit.setUTCDate(limit.getUTCDate() + 730);
    if (!isDate(date)) errors.targetSsbDate = "Enter a valid date.";
    else if (date < todayIst) errors.targetSsbDate = "Choose a date from today onwards.";
    else if (date > limit.toISOString().slice(0, 10)) errors.targetSsbDate = "Choose a date within the next two years.";
  }
  const minutes = raw.dailyStudyMinutes === "" || raw.dailyStudyMinutes == null ? null : Number(raw.dailyStudyMinutes);
  if (minutes === null || !(STUDY_MINUTES as readonly number[]).includes(minutes)) errors.dailyStudyMinutes = "Choose how much time you can give each day.";
  const preferredLanguage = raw.preferredLanguage === "hi" ? "hi" : "en";
  const goals = String(raw.goals ?? "").trim();
  if (goals.length > 500) errors.goals = "Keep your goals under 500 characters.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { fullName, entryScheme: entryScheme as EntryScheme, targetSsbDate: date || null, preparationStage: preparationStage as PreparationStage, preferredLanguage, dailyStudyMinutes: minutes, goals } };
}

export function toPreferences(fullName: string, row: Record<string, unknown> | null): StudentPreferences {
  const r = row ?? {};
  return {
    fullName,
    entryScheme: typeof r.entry_scheme === "string" && r.entry_scheme in ENTRY_SCHEMES ? (r.entry_scheme as EntryScheme) : null,
    targetSsbDate: typeof r.target_ssb_date === "string" ? r.target_ssb_date : null,
    preparationStage: typeof r.preparation_stage === "string" && r.preparation_stage in PREPARATION_STAGES ? (r.preparation_stage as PreparationStage) : null,
    preferredLanguage: r.preferred_language === "hi" ? "hi" : "en",
    dailyStudyMinutes: typeof r.daily_study_minutes === "number" ? r.daily_study_minutes : null,
    goals: typeof r.goals === "string" ? r.goals : "",
    onboarded: typeof r.onboarded_at === "string",
  };
}

async function student() {
  const a = await getActor();
  return a && a.profile.role === "student" ? a : null;
}

export async function getMyPreferences(): Promise<ServiceResult<StudentPreferences>> {
  const me = await student();
  if (!me) return { ok: false, error: { code: "unauthorized", message: "Only a student has preparation preferences." } };
  const supabase = await createClient();
  const { data, error } = await supabase.from("student_profiles").select("entry_scheme, target_ssb_date, preparation_stage, preferred_language, daily_study_minutes, goals, onboarded_at").eq("user_id", me.id).maybeSingle();
  if (error) return mapDbError(error, "We couldn't load your preferences. Please try again.");
  return { ok: true, data: toPreferences(me.profile.fullName ?? "", data) };
}

export async function savePreferences(raw: Partial<Record<keyof PreferencesInput, unknown>>, todayIst: string): Promise<ServiceResult<null> & { fieldErrors?: PreferenceErrors }> {
  const me = await student();
  if (!me) return { ok: false, error: { code: "unauthorized", message: "Only a student has preparation preferences." } };
  const parsed = validatePreferences(raw, todayIst);
  if (!parsed.ok) return { ok: false, error: { code: "validation_error", message: "Please fix the highlighted fields." }, fieldErrors: parsed.errors };
  const v = parsed.value;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_student_preferences", { p_entry_scheme: v.entryScheme, p_target_date: v.targetSsbDate, p_stage: v.preparationStage, p_language: v.preferredLanguage, p_daily_minutes: v.dailyStudyMinutes, p_goals: v.goals });
  if (error) return mapDbError(error, "We couldn't save your preferences. Please try again.");
  if (v.fullName !== me.profile.fullName) {
    // The name lives on the profile; a failure here doesn't undo the preferences.
    await supabase.from("profiles").update({ full_name: v.fullName }).eq("id", me.id);
  }
  return { ok: true, data: null };
}
