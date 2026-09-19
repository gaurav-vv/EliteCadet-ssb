"use client";

import { createClient } from "@/lib/supabase/client";

// Updates the real Supabase profiles.full_name for the signed-in user —
// shared by the Student/Mentor/Academy profile & settings forms so a name
// change actually shows up in the header everywhere, not just in whichever
// form's own localStorage happened to store it.
export async function updateFullName(fullName: string): Promise<{ ok: boolean; message?: string }> {
  if (!fullName.trim()) {
    return { ok: false, message: "Your name is required." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "You're not signed in." };
  }

  const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);

  if (error) {
    return { ok: false, message: "We couldn't update your name. Please try again." };
  }

  return { ok: true };
}

// Requires supabase/migrations/0002_academies_update_policy.sql to be run —
// without it, RLS silently rejects the update (no policy = no access).
export async function updateAcademyName(academyId: string, name: string): Promise<{ ok: boolean; message?: string }> {
  if (!name.trim()) {
    return { ok: false, message: "Academy name is required." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("academies").update({ name: name.trim() }).eq("id", academyId);

  if (error) {
    return { ok: false, message: "We couldn't update your academy name. Please try again." };
  }

  return { ok: true };
}
