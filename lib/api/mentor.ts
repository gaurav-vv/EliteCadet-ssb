// Typed API client for the Mentor domain (AGENTS.md §9) — read paths only.
// Mutations (submitEvaluation, createSession, cancelSession) are Server
// Actions in lib/actions/mentor.ts — see that file for why. Backed by
// lib/mock/mentor.ts pre-backend (status.md, 2026-09-18). No real
// mentor→mentee authorization exists yet — see lib/mock/mentor.ts header.

import { MENTEES, MENTOR_NAME, getMenteeDetail, getMockDashboardData, getMenteeSummaries, sessions, evaluations } from "@/lib/mock/mentor";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import type { Evaluation, MenteeDetail, MenteeSummary, MentorDashboardData, MentorSession } from "@/types/mentor";

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

export async function getMentees(): Promise<ApiResult<MenteeSummary[]>> {
  return { ok: true, data: getMenteeSummaries() };
}

export async function getMentee(id: string): Promise<ApiResult<MenteeDetail>> {
  const mentee = getMenteeDetail(id);
  if (!mentee) {
    return { ok: false, error: { code: "not_found", message: "This student isn't one of your mentees." } };
  }
  return { ok: true, data: mentee };
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
