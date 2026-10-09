"use server";

// Demo-data controls for the Academy dashboard and Reports, which still read
// the in-memory sample data in lib/mock/academy.ts until Phase 9 (T088)
// replaces them with real figures. Students, batches and mentors themselves
// are real Postgres data now (lib/actions/{batches,academy-people}.ts).

import { revalidatePath } from "next/cache";
import { clearAcademyDemoData, resetAcademyDemoData } from "@/lib/mock/academy";

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: "validation_error" | "not_found"; message: string };
}

function refreshDemoViews() {
  revalidatePath("/academy");
  revalidatePath("/academy/reports");
}

export async function loadDemoDataAction(): Promise<ActionResult<null>> {
  resetAcademyDemoData();
  refreshDemoViews();
  return { ok: true, data: null };
}

export async function clearDemoDataAction(): Promise<ActionResult<null>> {
  clearAcademyDemoData();
  refreshDemoViews();
  return { ok: true, data: null };
}
