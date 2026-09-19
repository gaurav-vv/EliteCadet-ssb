// Typed API client for Student Progress (T036, AGENTS.md §9). Backed by
// lib/mock/progress.ts pre-backend (status.md, 2026-09-18).

import { getMockProgressData } from "@/lib/mock/progress";
import type { StudentProgressData } from "@/types/progress";

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
}

export async function getProgressData(variant: "empty" | "active" = "empty"): Promise<ApiResult<StudentProgressData>> {
  return { ok: true, data: getMockProgressData(variant) };
}
