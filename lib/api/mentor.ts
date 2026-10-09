// Mentor dashboard read path only — still backed by the in-memory sample data
// in lib/mock/mentor.ts until Phase 9 (T088). Mentees, sessions, assessments
// and evaluations are real (lib/server/{academy-people,sessions,assessments}).

import { MENTOR_NAME, getMockDashboardData } from "@/lib/mock/mentor";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import type { MentorDashboardData } from "@/types/mentor";

export interface ApiError {
  code: "validation_error" | "not_found" | "network_error";
  message: string;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: ApiError;
}

export async function getDashboardData(): Promise<ApiResult<MentorDashboardData>> {
  const { profile } = await getCurrentUserAndProfile();
  return { ok: true, data: getMockDashboardData(profile?.fullName || MENTOR_NAME) };
}





