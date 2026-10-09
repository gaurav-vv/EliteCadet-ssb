// Role dashboards (specs.md §8a.4e, Phase 9): read-only summaries over the
// data earlier phases store. Each function checks the role first and scopes
// to the caller (own record / own batches / own academy); RLS applies too.
// Numbers are built from the same services the linked pages use, so a
// dashboard figure always matches the page it points to.

import { findMyBatchIds, countStudents } from "@/lib/server/academy-people/repository";
import { getAcademyMentors } from "@/lib/server/academy-people/service";
import { getMyAcademy } from "@/lib/server/academies/service";
import { getAcademyAssessments, getMentorAssessments, getReviewQueue, getStudentAssessments } from "@/lib/server/assessments/service";
import { getActor } from "@/lib/server/auth/guard";
import { countStartingWithin, isIstToday, isPendingReview, monthlyAverages, scoreBuckets, scoreTrend, submittedWithin } from "@/lib/server/dashboards/compute";
import { attentionReason, averagePct, categoryAverages, sortAttention, summarize } from "@/lib/server/progress/compute";
import { getMyJourneyProgress } from "@/lib/server/practice/journey-progress";
import { getMyStreak } from "@/lib/server/practice/service";
import { getAcademyPerformance, getMyProgress, toScorePoint } from "@/lib/server/progress/service";
import { getAcademySessions, getMySessions, getMyStudentSessions } from "@/lib/server/sessions/service";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import type { ActivityEntry, AcademyDashboard, MenteeRow, MentorDashboard, StudentDashboard } from "@/types/dashboards";
import type { AttentionStudent, ScorePoint } from "@/types/progress";

const fail = <T>(message: string): ServiceResult<T> => ({ ok: false, error: { code: "unauthorized", message } });
const firstName = (name: string | null | undefined, fallback: string) => name?.trim().split(/\s+/)[0] || fallback;
const ACTIVITY_LIMIT = 5;

// ---- Student --------------------------------------------------------------------

export async function getStudentDashboard(nowIso: string): Promise<ServiceResult<StudentDashboard>> {
  const me = await getActor();
  if (!me || me.profile.role !== "student") return fail("Only a student has this dashboard.");
  const [progress, sessions, assessments, journey, streakDays] = await Promise.all([getMyProgress(nowIso), getMyStudentSessions("upcoming", nowIso), getStudentAssessments(), getMyJourneyProgress(), getMyStreak(nowIso)]);
  if (!progress.ok || !progress.data) return progress as ServiceResult<never>;

  const activity: ActivityEntry[] = [];
  for (const a of assessments.data ?? []) {
    const t = a.attempt;
    if (!t?.submittedAt) continue;
    const href = `/student/assessments/${a.id}`;
    if (t.feedback?.status === "reviewed" && t.feedback.reviewedAt) {
      activity.push({ id: `${t.id}-r`, title: `Feedback on "${a.title}"`, detail: t.feedback.score !== null ? `Score ${t.feedback.score}/${a.maxScore}` : "Reviewed", at: t.feedback.reviewedAt, href });
    }
    activity.push({ id: `${t.id}-s`, title: `Submitted "${a.title}"`, detail: "Assessment", at: t.submittedAt, href });
  }

  return {
    ok: true,
    data: {
      firstName: firstName(me.profile.fullName, "there"),
      summary: progress.data.summary,
      nextSession: sessions.data?.[0] ?? null,
      recommendations: progress.data.recommendations,
      recentActivity: activity.sort((a, b) => b.at.localeCompare(a.at)).slice(0, ACTIVITY_LIMIT),
      // A failed journey read hides the mission card rather than failing the dashboard.
      mission: journey.ok && journey.data ? journey.data.mission : null,
      streakDays,
    },
  };
}

// ---- Mentor ---------------------------------------------------------------------

export async function getMentorDashboard(nowIso: string): Promise<ServiceResult<MentorDashboard>> {
  const me = await getActor();
  if (!me || me.profile.role !== "mentor") return fail("Only a mentor has this dashboard.");
  const [batches, sessions, queue, assessments] = await Promise.all([findMyBatchIds(me.id), getMySessions("upcoming", nowIso), getReviewQueue(), getMentorAssessments()]);
  if (batches.error) return mapDbError(batches.error, "We couldn't load your dashboard. Please try again.");
  for (const r of [sessions, queue, assessments]) if (!r.ok) return r as ServiceResult<never>;
  const batchIds = batches.data.map((b) => b.id);

  let mentees: MenteeRow[] = [];
  let attention: AttentionStudent[] = [];
  let allPoints: ScorePoint[] = [];
  if (batchIds.length > 0) {
    const supabase = await createClient();
    const students = await supabase.from("academy_students").select("id, full_name, email, batch_id, batch_name").in("batch_id", batchIds).order("full_name").limit(500);
    if (students.error) return mapDbError(students.error, "We couldn't load your dashboard. Please try again.");
    const ids = (students.data ?? []).map((s) => s.id as string);
    const [rows, scores] = ids.length
      ? await Promise.all([
          supabase.from("student_progress").select("*").in("student_id", ids),
          supabase.from("student_scores").select("student_id, assessment_id, title, category, score, max_score, score_pct, reviewed_at").in("student_id", ids),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
    const failed = rows.error ?? scores.error;
    if (failed) return mapDbError(failed, "We couldn't load your dashboard. Please try again.");

    const pointsBy = new Map<string, ScorePoint[]>();
    for (const r of (scores.data ?? []) as Record<string, unknown>[]) {
      const p = toScorePoint(r);
      if (p && typeof r.student_id === "string") pointsBy.set(r.student_id, [...(pointsBy.get(r.student_id) ?? []), p]);
    }
    const rowBy = new Map(((rows.data ?? []) as Record<string, unknown>[]).map((r) => [r.student_id as string, r]));
    const openBatches = new Set((assessments.data ?? []).filter((a) => a.status === "published").map((a) => a.batchId));

    for (const st of (students.data ?? []) as Record<string, unknown>[]) {
      const id = st.id as string;
      const name = (st.full_name as string) || (st.email as string) || "Student";
      const points = pointsBy.get(id) ?? [];
      const r = rowBy.get(id);
      const summary = summarize(
        { reviewedCount: Number(r?.reviewed_count) || 0, sessionsPresent: Number(r?.sessions_present) || 0, sessionsAbsent: Number(r?.sessions_absent) || 0, contentCompleted: Number(r?.content_completed) || 0, lastSubmissionAt: typeof r?.last_submission_at === "string" ? r.last_submission_at : null },
        points,
      );
      const { last, trend } = scoreTrend(points);
      mentees.push({ studentId: id, name, batchName: (st.batch_name as string) ?? null, avgScorePct: summary.avgScorePct, lastScorePct: last, trend });
      const reason = attentionReason(summary, { nowIso, batchHadOpenAssessment: openBatches.has(st.batch_id as string) });
      if (reason) attention.push({ studentId: id, name, batchName: (st.batch_name as string) ?? null, reason });
      allPoints = allPoints.concat(points);
    }
    attention = sortAttention(attention);
    // Lowest average first: the mentees who most need a look.
    mentees = mentees.sort((a, b) => (a.avgScorePct ?? 101) - (b.avgScorePct ?? 101) || a.name.localeCompare(b.name));
  }

  const pending = (queue.data ?? []).filter(isPendingReview);
  return {
    ok: true,
    data: {
      firstName: firstName(me.profile.fullName, "there"),
      menteeCount: mentees.length,
      sessionsNext7Days: countStartingWithin(sessions.data ?? [], nowIso, 7),
      pendingReviews: pending.length,
      avgScorePct: averagePct(allPoints),
      todaysSessions: (sessions.data ?? []).filter((s) => isIstToday(s.startsAt, nowIso)),
      reviewQueue: pending.slice(0, ACTIVITY_LIMIT).map((t) => ({ attemptId: t.id, studentName: t.studentName ?? "Student", assessmentTitle: t.assessmentTitle, submittedAt: t.submittedAt ?? "" })),
      mentees: mentees.slice(0, 8),
      attention,
    },
  };
}

// ---- Academy --------------------------------------------------------------------

export async function getAcademyDashboard(nowIso: string): Promise<ServiceResult<AcademyDashboard>> {
  const me = await getActor();
  if (!me || me.profile.role !== "academy_admin" || !me.profile.academyId) return fail("Only an academy admin has this dashboard.");
  const academyId = me.profile.academyId;
  const supabase = await createClient();
  const [academy, perf, counts, batches, mentors, sessions, assessments] = await Promise.all([
    getMyAcademy(),
    getAcademyPerformance(nowIso),
    countStudents(academyId),
    supabase.from("batch_overview").select("id, name, status, mentor_count, student_count").eq("academy_id", academyId).eq("status", "active").order("name"),
    getAcademyMentors(),
    getAcademySessions("upcoming", nowIso),
    getAcademyAssessments(),
  ]);
  for (const r of [academy, perf, mentors, sessions, assessments]) if (!r.ok) return r as ServiceResult<never>;
  const dbFailed = counts.error ?? batches.error;
  if (dbFailed) return mapDbError(dbFailed, "We couldn't load your academy dashboard. Please try again.");
  const p = perf.data!;

  const pendingBy = new Map<string, number>();
  for (const a of assessments.data ?? []) pendingBy.set(a.mentorId, (pendingBy.get(a.mentorId) ?? 0) + Math.max(0, a.submitted - a.reviewed));
  const upcoming = sessions.data ?? [];
  const perfBy = new Map(p.batches.map((b) => [b.batchId, b]));
  const batchRows = ((batches.data ?? []) as Record<string, unknown>[]).map((b) => ({
    batchId: b.id as string,
    name: b.name as string,
    studentCount: Number(b.student_count) || 0,
    mentorCount: Number(b.mentor_count) || 0,
    avgScorePct: perfBy.get(b.id as string)?.avgScorePct ?? null,
  }));

  return {
    ok: true,
    data: {
      academyName: academy.data!.name,
      totalStudents: counts.data!.total,
      studentsInBatch: counts.data!.inBatch,
      activeBatches: batchRows.length,
      batchesWithoutMentor: batchRows.filter((b) => b.mentorCount === 0).length,
      mentorCount: (mentors.data ?? []).length,
      pendingInvites: (mentors.data ?? []).filter((m) => m.invited).length,
      summary: p.academy,
      pendingReviews: [...pendingBy.values()].reduce((s, n) => s + n, 0),
      sessionsNext7Days: countStartingWithin(upcoming, nowIso, 7),
      monthlyScores: monthlyAverages(p.points),
      categories: categoryAverages(p.points),
      scoreBuckets: scoreBuckets(p.students.map((s) => s.summary.avgScorePct)),
      batches: batchRows.map((b) => ({ batchId: b.batchId, name: b.name, studentCount: b.studentCount, avgScorePct: b.avgScorePct })),
      attention: p.attention,
      recentActivity: p.students
        .filter((s): s is typeof s & { summary: { lastSubmissionAt: string } } => s.summary.lastSubmissionAt !== null)
        .sort((a, b) => b.summary.lastSubmissionAt.localeCompare(a.summary.lastSubmissionAt))
        .slice(0, ACTIVITY_LIMIT)
        .map((s) => ({ id: s.studentId, title: s.name, detail: s.batchName ? `Submitted an assessment · ${s.batchName}` : "Submitted an assessment", at: s.summary.lastSubmissionAt, href: `/academy/students/${s.studentId}` })),
      upcomingSessions: upcoming.slice(0, 5),
      mentors: (mentors.data ?? []).map((m) => ({
        mentorId: m.id,
        name: m.fullName || m.email || "Mentor",
        invited: m.invited,
        batches: m.batches.length,
        sessionsNext7Days: countStartingWithin(upcoming.filter((s) => s.mentorId === m.id), nowIso, 7),
        pendingReviews: pendingBy.get(m.id) ?? 0,
      })),
      activeStudents14Days: p.students.filter((s) => submittedWithin(s.summary.lastSubmissionAt, nowIso, 14)).length,
    },
  };
}
