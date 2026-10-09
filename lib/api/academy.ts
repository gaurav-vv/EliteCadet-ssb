// Read paths for the Academy dashboard and Reports only — still backed by the
// in-memory sample data in lib/mock/academy.ts until Phase 9 (T088). Real
// students, batches and mentors live in lib/server/academy-people and
// lib/api/batches.ts.

import { MENTORS, STUDENTS, getMockDashboardData } from "@/lib/mock/academy";
import { getMockAnalytics } from "@/lib/mock/academy-analytics";
import type { AcademyAnalytics, AcademyDashboardData, AcademyMentor, AcademyStudent } from "@/types/academy";

export interface ApiError {
  code: "validation_error" | "not_found";
  message: string;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export async function getDashboardData(): Promise<ApiResult<AcademyDashboardData>> {
  return { ok: true, data: getMockDashboardData() };
}

// Trend, skill and session analytics. Demo-backed until assessment and session
// tables exist; the `source` field tells the UI to label it as demo data.
export async function getAnalytics(): Promise<ApiResult<AcademyAnalytics>> {
  return { ok: true, data: getMockAnalytics() };
}

export async function getStudents(): Promise<ApiResult<AcademyStudent[]>> {
  return { ok: true, data: STUDENTS };
}




export async function getMentors(): Promise<ApiResult<AcademyMentor[]>> {
  return { ok: true, data: MENTORS };
}

