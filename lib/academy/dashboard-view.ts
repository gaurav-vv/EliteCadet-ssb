import type { AcademyDashboard } from "@/types/dashboards";
import type { DashboardMetric, DashboardTask } from "@/types/academy";

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

// Presentation only: every value comes from getAcademyDashboard (real rows).
function buildMetrics(d: AcademyDashboard): DashboardMetric[] {
  return [
    {
      id: "students",
      label: "Total Students",
      value: String(d.totalStudents),
      detail: d.totalStudents === 0 ? "No students yet" : `${d.studentsInBatch} in a batch`,
      icon: "students",
      tone: "indigo",
      href: "/academy/students",
    },
    {
      id: "batches",
      label: "Active Batches",
      value: String(d.activeBatches),
      detail: d.activeBatches === 0 ? "No batches yet" : d.batchesWithoutMentor > 0 ? `${plural(d.batchesWithoutMentor, "batch", "batches")} without a mentor` : "All have a mentor",
      icon: "batches",
      tone: "indigo",
      href: "/academy/batches",
    },
    {
      id: "mentors",
      label: "Mentors",
      value: String(d.mentorCount),
      detail: d.mentorCount === 0 ? "No mentors yet" : d.pendingInvites > 0 ? `${plural(d.pendingInvites, "invite")} pending` : "All active",
      icon: "mentors",
      tone: "warning",
      href: "/academy/mentors",
    },
    {
      id: "score",
      label: "Avg. Score",
      value: d.summary.avgScorePct === null ? "—" : `${d.summary.avgScorePct}%`,
      detail: d.summary.reviewedCount === 0 ? "No reviewed assessments yet" : `From ${plural(d.summary.reviewedCount, "reviewed assessment")}`,
      icon: "performance",
      tone: "success",
      href: "/academy/performance",
    },
    {
      id: "attendance",
      label: "Attendance",
      value: d.summary.attendancePct === null ? "—" : `${d.summary.attendancePct}%`,
      detail: d.summary.attendancePct === null ? "No sessions marked yet" : `${d.summary.sessionsPresent} present of ${d.summary.sessionsPresent + d.summary.sessionsAbsent} marked`,
      icon: "sessions",
      tone: "info",
      href: "/academy/sessions",
    },
  ];
}

function buildTasks(d: AcademyDashboard): DashboardTask[] {
  const tasks: DashboardTask[] = [];
  if (d.attention.length > 0) {
    tasks.push({ id: "attention", title: "Students Need Attention", description: `${plural(d.attention.length, "student")} flagged for low scores, missed submissions or attendance`, priority: "High", icon: "attention", tone: "danger", href: "/academy/performance" });
  }
  if (d.pendingReviews > 0) {
    tasks.push({ id: "pending-reviews", title: "Reviews Waiting", description: `${plural(d.pendingReviews, "submission")} waiting for a mentor review`, priority: "High", icon: "evaluations", tone: "warning", href: "/academy/assessments" });
  }
  if (d.batchesWithoutMentor > 0) {
    tasks.push({ id: "no-mentor", title: "Assign a Mentor", description: `${plural(d.batchesWithoutMentor, "active batch", "active batches")} without a mentor`, priority: "Medium", icon: "batches", tone: "indigo", href: "/academy/batches" });
  }
  if (d.totalStudents - d.studentsInBatch > 0) {
    tasks.push({ id: "no-batch", title: "Place Students in a Batch", description: `${plural(d.totalStudents - d.studentsInBatch, "student")} not in a batch yet`, priority: "Medium", icon: "activeStudents", tone: "indigo", href: "/academy/students?batch=none" });
  }
  if (d.pendingInvites > 0) {
    tasks.push({ id: "invites", title: "Follow Up on Mentor Invites", description: `${plural(d.pendingInvites, "mentor")} hasn't accepted the invite yet`, priority: "Medium", icon: "mentors", tone: "indigo", href: "/academy/mentors" });
  }
  if (d.sessionsNext7Days > 0) {
    tasks.push({ id: "sessions", title: "Sessions This Week", description: `${plural(d.sessionsNext7Days, "session")} in the next 7 days`, priority: "Medium", icon: "sessions", tone: "info", href: "/academy/sessions" });
  }
  return tasks;
}

export function buildDashboardViewModel(d: AcademyDashboard): { metrics: DashboardMetric[]; tasks: DashboardTask[] } {
  return { metrics: buildMetrics(d), tasks: buildTasks(d) };
}
