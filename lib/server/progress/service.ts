// Progress service (specs.md §8a.4d): the same real data, shown per role.
// Reads the student_scores / student_progress views (0012) under the caller's
// own RLS, plus attendance and Library-completion writes.

import { getActor, type Actor } from "@/lib/server/auth/guard";
import { getMyMentee } from "@/lib/server/academy-people/service";
import { getStudentAssessments } from "@/lib/server/assessments/service";
import { isCategory } from "@/lib/server/content/validation";
import { attendancePct, attentionReason, averagePct, categoryAverages, sortAttention, strengthAndWeakArea, summarize, trendOf } from "@/lib/server/progress/compute";
import { getMyStudentSessions } from "@/lib/server/sessions/service";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import { CONTENT_CATEGORIES } from "@/types/content";
import type { AttendanceStatus, AttentionStudent, BatchPerformance, ProgressSummary, Recommendation, ScorePoint, StudentProgress } from "@/types/progress";

const fail = <T>(code: "validation_error" | "not_found" | "unauthorized", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });

export function toScorePoint(row: unknown): ScorePoint | null {
  if (typeof row !== "object" || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.assessment_id !== "string" || typeof r.reviewed_at !== "string" || !isCategory(r.category)) return null;
  const pct = Number(r.score_pct);
  if (!Number.isFinite(pct)) return null;
  return {
    assessmentId: r.assessment_id,
    title: typeof r.title === "string" ? r.title : "Assessment",
    category: r.category,
    scorePct: pct,
    score: Number(r.score),
    maxScore: Number(r.max_score),
    reviewedAt: r.reviewed_at,
    improvementAreas: typeof r.improvement_areas === "string" && r.improvement_areas ? r.improvement_areas : null,
    strengths: typeof r.strengths === "string" && r.strengths ? r.strengths : null,
  };
}

function progressRow(r: Record<string, unknown> | null | undefined) {
  return {
    reviewedCount: Number(r?.reviewed_count) || 0,
    sessionsPresent: Number(r?.sessions_present) || 0,
    sessionsAbsent: Number(r?.sessions_absent) || 0,
    contentCompleted: Number(r?.content_completed) || 0,
    lastSubmissionAt: typeof r?.last_submission_at === "string" ? r.last_submission_at : null,
  };
}

async function loadStudent(studentId: string): Promise<ServiceResult<StudentProgress>> {
  const supabase = await createClient();
  const [row, scores] = await Promise.all([
    supabase.from("student_progress").select("*").eq("student_id", studentId).maybeSingle(),
    supabase.from("student_scores").select("*").eq("student_id", studentId).order("reviewed_at", { ascending: true }).limit(500),
  ]);
  if (row.error) return mapDbError(row.error, "We couldn't load progress. Please try again.");
  if (scores.error) return mapDbError(scores.error, "We couldn't load progress. Please try again.");
  const points = (scores.data ?? []).map(toScorePoint).filter((p): p is ScorePoint => p !== null);
  const categories = categoryAverages(points);
  const { strength, weakArea } = strengthAndWeakArea(categories);
  return {
    ok: true,
    data: {
      summary: summarize(progressRow(row.data as Record<string, unknown> | null), points),
      trend: trendOf(points),
      categories,
      strength,
      weakArea,
      recentFeedback: [...points].reverse().filter((p) => p.improvementAreas || p.strengths).slice(0, 3),
    },
  };
}

// ---- Student: My Progress --------------------------------------------------------

export async function getMyProgress(nowIso: string): Promise<ServiceResult<StudentProgress & { recommendations: Recommendation[] }>> {
  const me = await getActor();
  if (!me || me.profile.role !== "student") return fail("unauthorized", "Only a student has My Progress.");
  const progress = await loadStudent(me.id);
  if (!progress.ok || !progress.data) return progress as ServiceResult<never>;
  const recommendations = await recommend(me, progress.data, nowIso);
  return { ok: true, data: { ...progress.data, recommendations } };
}

// Rule-based and explainable (specs.md §6.3): each item says why.
async function recommend(me: Actor, p: StudentProgress, nowIso: string): Promise<Recommendation[]> {
  const out: Recommendation[] = [];
  const assessments = await getStudentAssessments();
  for (const a of assessments.data ?? []) {
    const open = a.status === "published" && (!a.dueAt || Date.parse(a.dueAt) >= Date.parse(nowIso));
    if (open && a.attempt?.status !== "submitted") out.push({ title: `Complete "${a.title}"`, reason: a.dueAt ? "It's open and due soon." : "It's open and you haven't submitted yet.", href: `/student/assessments/${a.id}` });
    if (out.length >= 2) break;
  }
  const sessions = await getMyStudentSessions("upcoming", nowIso);
  const next = sessions.data?.[0];
  if (next) out.push({ title: `Attend "${next.title}"`, reason: "Your next scheduled session.", href: "/student/sessions" });
  if (p.weakArea) {
    const supabase = await createClient();
    const [contents, done] = await Promise.all([
      supabase.from("contents").select("id, title").eq("status", "published").eq("category", p.weakArea.category).limit(10),
      supabase.from("content_progress").select("content_id").eq("student_id", me.id),
    ]);
    const completed = new Set((done.data ?? []).map((d) => d.content_id));
    const item = (contents.data ?? []).find((c) => !completed.has(c.id));
    if (item) out.push({ title: `Read "${item.title}"`, reason: `${CONTENT_CATEGORIES[p.weakArea.category]} is your lowest-scoring area (${p.weakArea.avgPct}%).`, href: `/student/library/${item.id}` });
  }
  return out;
}

export async function setContentDone(contentId: string, done: boolean): Promise<ServiceResult<null>> {
  const me = await getActor();
  if (!me || me.profile.role !== "student") return fail("unauthorized", "Only a student can track their reading.");
  if (!isUuid(contentId)) return fail("not_found", "We couldn't find that item.");
  const supabase = await createClient();
  const { error } = done
    ? await supabase.from("content_progress").upsert({ content_id: contentId, student_id: me.id }, { onConflict: "content_id,student_id" })
    : await supabase.from("content_progress").delete().eq("content_id", contentId).eq("student_id", me.id);
  if (error) return mapDbError(error, "We couldn't save that. Please try again.");
  return { ok: true, data: null };
}

export async function isContentDone(contentId: string): Promise<boolean> {
  const me = await getActor();
  if (!me || me.profile.role !== "student" || !isUuid(contentId)) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("content_progress").select("content_id").eq("content_id", contentId).eq("student_id", me.id).maybeSingle();
  return Boolean(data);
}

// ---- Mentor: My Assigned Students ---------------------------------------------------

export async function getMenteeProgress(studentId: string): Promise<ServiceResult<StudentProgress>> {
  const check = await getMyMentee(studentId); // "not found" unless in this mentor's batches
  if (!check.ok) return check as ServiceResult<never>;
  return loadStudent(studentId);
}

export async function getMenteeSummaries(studentIds: string[]): Promise<Map<string, ProgressSummary>> {
  const map = new Map<string, ProgressSummary>();
  if (studentIds.length === 0) return map;
  const supabase = await createClient();
  const [rows, scores] = await Promise.all([
    supabase.from("student_progress").select("*").in("student_id", studentIds),
    supabase.from("student_scores").select("student_id, assessment_id, title, category, score, max_score, score_pct, reviewed_at").in("student_id", studentIds),
  ]);
  const byStudent = new Map<string, ScorePoint[]>();
  for (const r of (scores.data ?? []) as Record<string, unknown>[]) {
    const p = toScorePoint(r);
    if (p && typeof r.student_id === "string") byStudent.set(r.student_id, [...(byStudent.get(r.student_id) ?? []), p]);
  }
  for (const r of (rows.data ?? []) as Record<string, unknown>[]) {
    if (typeof r.student_id === "string") map.set(r.student_id, summarize(progressRow(r), byStudent.get(r.student_id) ?? []));
  }
  return map;
}

// ---- Mentor: attendance ------------------------------------------------------------

export interface AttendanceSheet {
  canMark: boolean;
  rows: { studentId: string; name: string; status: AttendanceStatus | null }[];
}

export async function getAttendanceSheet(sessionId: string): Promise<ServiceResult<AttendanceSheet>> {
  const me = await getActor();
  if (!me || me.profile.role !== "mentor") return fail("unauthorized", "Only a mentor can mark attendance.");
  if (!isUuid(sessionId)) return fail("not_found", "We couldn't find that session.");
  const supabase = await createClient();
  const { data: s, error } = await supabase.from("sessions").select("id, batch_id, starts_at, status, for_whole_batch, session_participants(student_id)").eq("id", sessionId).eq("mentor_id", me.id).maybeSingle();
  if (error) return mapDbError(error);
  if (!s) return fail("not_found", "We couldn't find that session.");
  const selected = new Set(((s.session_participants as { student_id: string }[] | null) ?? []).map((p) => p.student_id));
  const [students, marks] = await Promise.all([
    supabase.from("academy_students").select("id, full_name, email").eq("batch_id", s.batch_id as string).order("full_name"),
    supabase.from("session_attendance").select("student_id, status").eq("session_id", sessionId),
  ]);
  if (students.error) return mapDbError(students.error);
  const status = new Map(((marks.data ?? []) as { student_id: string; status: AttendanceStatus }[]).map((m) => [m.student_id, m.status]));
  const rows = ((students.data ?? []) as Record<string, unknown>[])
    .filter((st) => s.for_whole_batch || selected.has(st.id as string))
    .map((st) => ({ studentId: st.id as string, name: (st.full_name as string) || (st.email as string) || "Student", status: status.get(st.id as string) ?? null }));
  const canMark = s.status !== "cancelled" && Date.parse(s.starts_at as string) <= Date.now();
  return { ok: true, data: { canMark, rows } };
}

export async function markAttendance(sessionId: string, entries: { studentId: string; status: string }[]): Promise<ServiceResult<null>> {
  const me = await getActor();
  if (!me || me.profile.role !== "mentor") return fail("unauthorized", "Only a mentor can mark attendance.");
  const sheet = await getAttendanceSheet(sessionId);
  if (!sheet.ok || !sheet.data) return sheet as ServiceResult<never>;
  if (!sheet.data.canMark) return fail("validation_error", "Attendance can be marked once the session has started.");
  const allowed = new Set(sheet.data.rows.map((r) => r.studentId));
  const clean = entries.filter((e) => allowed.has(e.studentId) && ["present", "absent", "excused"].includes(e.status));
  if (clean.length === 0) return fail("validation_error", "Mark at least one participant.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("session_attendance")
    .upsert(clean.map((e) => ({ session_id: sessionId, student_id: e.studentId, status: e.status, marked_by: me.id })), { onConflict: "session_id,student_id" });
  if (error) return mapDbError(error, "We couldn't save attendance. Please try again.");
  return { ok: true, data: null };
}

// ---- Academy: Performance --------------------------------------------------------

export interface AcademyPerformance {
  batches: BatchPerformance[];
  attention: AttentionStudent[];
  academy: ProgressSummary;
  // For the dashboard and Reports (Phase 9): the same rows, not a second query.
  students: { studentId: string; name: string; batchName: string | null; summary: ProgressSummary }[];
  points: ScorePoint[];
}

export async function getAcademyPerformance(nowIso: string): Promise<ServiceResult<AcademyPerformance>> {
  const me = await getActor();
  if (!me || me.profile.role !== "academy_admin" || !me.profile.academyId) return fail("unauthorized", "Only an academy admin can view performance.");
  const academyId = me.profile.academyId;
  const supabase = await createClient();
  const [batches, rows, scores, students, open] = await Promise.all([
    supabase.from("batches").select("id, name").eq("academy_id", academyId).eq("status", "active").order("name"),
    supabase.from("student_progress").select("*").eq("academy_id", academyId),
    supabase.from("student_scores").select("student_id, assessment_id, title, category, score, max_score, score_pct, reviewed_at, batch_id"),
    supabase.from("academy_students").select("id, full_name, email, batch_id, batch_name").eq("academy_id", academyId),
    supabase.from("assessments").select("batch_id").eq("academy_id", academyId).eq("status", "published"),
  ]);
  const failed = batches.error ?? rows.error ?? scores.error ?? students.error ?? open.error;
  if (failed) return mapDbError(failed, "We couldn't load performance. Please try again.");

  const pointsBy = new Map<string, ScorePoint[]>();
  for (const r of (scores.data ?? []) as Record<string, unknown>[]) {
    const p = toScorePoint(r);
    if (p && typeof r.student_id === "string") pointsBy.set(r.student_id, [...(pointsBy.get(r.student_id) ?? []), p]);
  }
  const summaryBy = new Map<string, { batchId: string | null; summary: ProgressSummary }>();
  const practiceBy = new Map<string, number>();
  for (const r of (rows.data ?? []) as Record<string, unknown>[]) {
    if (typeof r.student_id === "string") practiceBy.set(r.student_id, Number(r.practice_done) || 0);
    if (typeof r.student_id === "string") summaryBy.set(r.student_id, { batchId: typeof r.batch_id === "string" ? r.batch_id : null, summary: summarize(progressRow(r), pointsBy.get(r.student_id) ?? []) });
  }
  const openBatches = new Set(((open.data ?? []) as { batch_id: string }[]).map((a) => a.batch_id));

  const perBatch: BatchPerformance[] = ((batches.data ?? []) as { id: string; name: string }[]).map((b) => {
    const memberIds = [...summaryBy.entries()].filter(([, v]) => v.batchId === b.id).map(([id]) => id);
    const members = memberIds.map((id) => summaryBy.get(id)!);
    const points = memberIds.flatMap((id) => pointsBy.get(id) ?? []);
    const present = members.reduce((s, m) => s + m.summary.sessionsPresent, 0);
    const absent = members.reduce((s, m) => s + m.summary.sessionsAbsent, 0);
    const practiceDone = memberIds.reduce((sum, id) => sum + (practiceBy.get(id) ?? 0), 0);
    return { batchId: b.id, batchName: b.name, students: members.length, avgScorePct: averagePct(points), attendancePct: attendancePct(present, absent), reviewedCount: points.length, practiceDone };
  });

  const attention: AttentionStudent[] = [];
  const studentRows: AcademyPerformance["students"] = [];
  for (const st of (students.data ?? []) as Record<string, unknown>[]) {
    const entry = summaryBy.get(st.id as string);
    if (!entry) continue;
    studentRows.push({ studentId: st.id as string, name: (st.full_name as string) || (st.email as string) || "Student", batchName: (st.batch_name as string) ?? null, summary: entry.summary });
    const reason = attentionReason(entry.summary, { nowIso, batchHadOpenAssessment: Boolean(entry.batchId && openBatches.has(entry.batchId)) });
    if (reason) attention.push({ studentId: st.id as string, name: (st.full_name as string) || (st.email as string) || "Student", batchName: (st.batch_name as string) ?? null, reason });
  }

  const all = [...summaryBy.values()];
  const allPoints = [...pointsBy.entries()].filter(([id]) => summaryBy.has(id)).flatMap(([, p]) => p);
  const academy: ProgressSummary = {
    reviewedCount: allPoints.length,
    avgScorePct: averagePct(allPoints),
    sessionsPresent: all.reduce((s, m) => s + m.summary.sessionsPresent, 0),
    sessionsAbsent: all.reduce((s, m) => s + m.summary.sessionsAbsent, 0),
    attendancePct: attendancePct(all.reduce((s, m) => s + m.summary.sessionsPresent, 0), all.reduce((s, m) => s + m.summary.sessionsAbsent, 0)),
    contentCompleted: all.reduce((s, m) => s + m.summary.contentCompleted, 0),
    lastSubmissionAt: null,
  };
  return { ok: true, data: { batches: perBatch, attention: sortAttention(attention), academy, students: studentRows, points: allPoints } };
}
