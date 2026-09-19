// Typed API client for the Academy Admin domain (AGENTS.md §9) — read paths
// only. Mutations are Server Actions in lib/actions/academy.ts (see
// lib/actions/mentor.ts for why plain functions don't work here). Backed by
// lib/mock/academy.ts pre-backend (status.md, 2026-09-19).

import {
  BATCHES,
  MENTORS,
  SETTINGS,
  STUDENTS,
  getBatch,
  getBatchName,
  getMentorName,
  getMockDashboardData,
  getStudent,
} from "@/lib/mock/academy";
import type { AcademyBatch, AcademyDashboardData, AcademyMentor, AcademySettings, AcademyStudent } from "@/types/academy";

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

export async function getSettings(): Promise<ApiResult<AcademySettings>> {
  return { ok: true, data: SETTINGS };
}

export { getBatchName, getMentorName };
