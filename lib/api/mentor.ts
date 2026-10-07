// Typed API client for the Mentor domain (AGENTS.md §9) — read paths only.
// Mutations (submitEvaluation, createSession, cancelSession) are Server
// Actions in lib/actions/mentor.ts — see that file for why. Backed by
// lib/mock/mentor.ts until Phases 6/7/9. Real mentees (students in the
// mentor's assigned batches) come from lib/server/academy-people/service.ts.

import { MENTEES, MENTOR_NAME, getMockDashboardData, sessions, evaluations } from "@/lib/mock/mentor";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import type { Evaluation, MentorDashboardData, MentorSession } from "@/types/mentor";

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



export async function getEvaluations(): Promise<ApiResult<Evaluation[]>> {
  return { ok: true, data: evaluations };
}

export async function getSessions(): Promise<ApiResult<MentorSession[]>> {
  return { ok: true, data: sessions };
}

export async function getMenteeOptions(): Promise<ApiResult<{ id: string; fullName: string }[]>> {
  return { ok: true, data: MENTEES.map(({ id, fullName }) => ({ id, fullName })) };
}
