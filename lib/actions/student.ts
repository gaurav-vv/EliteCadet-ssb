"use server";

// Student preferences, diagnostic — thin entry points over lib/server.

import { revalidatePath } from "next/cache";
import { submitDiagnostic } from "@/lib/server/diagnostic/service";
import { savePreferences } from "@/lib/server/student/preferences";
import type { PreferencesInput } from "@/types/student";

const todayIst = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

export async function savePreferencesAction(input: Partial<Record<keyof PreferencesInput, unknown>>) {
  const result = await savePreferences(input, todayIst());
  if (result.ok) revalidatePath("/student", "layout");
  return result;
}

export async function submitDiagnosticAction(answers: unknown) {
  const result = await submitDiagnostic(answers);
  if (result.ok) revalidatePath("/student", "layout");
  return result;
}
