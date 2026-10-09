// Typed API client for the Academy Admin domain (AGENTS.md §9) — read paths
// only. Mutations are Server Actions in lib/actions/academy.ts (see
// lib/actions/mentor.ts for why plain functions don't work here). Backed by
// lib/mock/academy.ts pre-backend (status.md, 2026-09-19).

import {
  BATCHES,
  MENTORS,
  STUDENTS,
  getBatch,
  getBatchName,
  getMentorName,
  getMockDashboardData,
  getStudent,
} from "@/lib/mock/academy";
import { getMockAnalytics } from "@/lib/mock/academy-analytics";
import type { AcademyAnalytics, AcademyBatch, AcademyDashboardData, AcademyMentor, AcademyStudent } from "@/types/academy";

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

export async function getStudentById(id: string): Promise<ApiResult<AcademyStudent>> {
  const student = getStudent(id);
  if (!student) return { ok: false, error: { code: "not_found", message: "Student not found." } };
  return { ok: true, data: student };
}

export async function getBatches(): Promise<ApiResult<AcademyBatch[]>> {
  return { ok: true, data: BATCHES };
}

export async function getBatchById(id: string): Promise<ApiResult<AcademyBatch>> {
  const batch = getBatch(id);
  if (!batch) return { ok: false, error: { code: "not_found", message: "Batch not found." } };
  return { ok: true, data: batch };
}

export async function getMentors(): Promise<ApiResult<AcademyMentor[]>> {
  return { ok: true, data: MENTORS };
}

export { getBatchName, getMentorName };
