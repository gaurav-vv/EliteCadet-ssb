"use server";

// Demo-data controls for the Mentor dashboard, which still reads the
// in-memory sample data in lib/mock/mentor.ts until Phase 9 (T088). Mentees,
// sessions, assessments and evaluations themselves are real Postgres data now.

import { revalidatePath } from "next/cache";
import { clearMentorDemoData, resetMentorDemoData } from "@/lib/mock/mentor";

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: "validation_error" | "not_found"; message: string };
}

export async function loadDemoDataAction(): Promise<ActionResult<null>> {
  resetMentorDemoData();
  revalidatePath("/mentor");
  return { ok: true, data: null };
}

export async function clearDemoDataAction(): Promise<ActionResult<null>> {
  clearMentorDemoData();
  revalidatePath("/mentor");
  return { ok: true, data: null };
}
