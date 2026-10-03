import type {
  AcademyDashboardData,
  AcademyMentor,
  AcademyStudent,
  DashboardActivity,
  DashboardMetric,
  DashboardTask,
  DashboardViewModel,
} from "@/types/academy";

const ACTIVITY_LIMIT = 5;
// An active student scoring below this is flagged as a low-performance alert.
export const LOW_READINESS_THRESHOLD = 60;

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

function buildMetrics(data: AcademyDashboardData, students: AcademyStudent[], mentors: AcademyMentor[]): DashboardMetric[] {
  const activeStudents = students.filter((s) => s.status === "active").length;
  const pendingInvites = mentors.filter((m) => m.status === "invited").length;

  return [
    {
      id: "students",
      label: "Total Students",
      value: String(data.totalStudents),
      detail: data.totalStudents === 0 ? "No students yet" : "Enrolled",
      icon: "students",
      tone: "indigo",
      href: "/academy/students",
    },
    {
      id: "batches",
      label: "Active Batches",
      value: String(data.activeBatches),
      detail: data.activeBatches === 0 ? "No batches yet" : "Currently running",
      icon: "batches",
      tone: "indigo",
      href: "/academy/batches",
    },
    {
      id: "mentors",
      label: "Mentors",
      value: String(data.totalMentors),
      detail:
        data.totalMentors === 0
          ? "No mentors yet"
          : pendingInvites > 0
            ? `${plural(pendingInvites, "invite")} pending`
            : "All active",
      icon: "mentors",
      tone: "warning",
      href: "/academy/mentors",
    },
    // The reference shows "Activity Completion"; that needs per-activity
    // completion records we don't store yet, so this card reports the real
    // share of students who are currently active instead.
    {
      id: "active-students",
      label: "Active Students",
      value: data.totalStudents === 0 ? "—" : `${Math.round((activeStudents / data.totalStudents) * 100)}%`,
      detail: data.totalStudents === 0 ? "No students yet" : `${activeStudents} of ${data.totalStudents} active`,
      icon: "activeStudents",
      tone: "success",
      href: "/academy/students",
    },
    {
      id: "readiness",
      label: "Avg. Performance",
      value: data.averageReadiness === null ? "—" : `${data.averageReadiness}%`,
      detail: data.averageReadiness === null ? "No scored students yet" : "Average readiness",
      icon: "readiness",
      tone: "danger",
      href: "/academy/reports",
    },
  ];
}

function buildTasks(data: AcademyDashboardData, students: AcademyStudent[], mentors: AcademyMentor[]): DashboardTask[] {
  const tasks: DashboardTask[] = [];

  const pendingEvaluations = mentors.reduce((sum, m) => sum + m.pendingEvaluations, 0);
  if (pendingEvaluations > 0) {
    tasks.push({
      id: "pending-evaluations",
      title: "Review Pending Evaluations",
      description: `${plural(pendingEvaluations, "submission")} awaiting review`,
      priority: "High",
      icon: "evaluations",
      tone: "warning",
      href: "/academy/mentors",
    });
  }

  const sessionsThisWeek = mentors.reduce((sum, m) => sum + m.sessionsThisWeek, 0);
  if (sessionsThisWeek > 0) {
    tasks.push({
      id: "sessions-week",
      title: "Sessions This Week",
      description: `${plural(sessionsThisWeek, "session")} scheduled`,
      priority: "Medium",
      icon: "sessions",
      tone: "info",
      href: "/academy/mentors",
    });
  }

  const inactive = students.filter((s) => s.status === "inactive").length;
  const dormant = data.attentionStudents.length;
  if (dormant > 0) {
    tasks.push({
      id: "inactive-students",
      title: "Inactive Students",
      description: `${plural(dormant, "student")} inactive or without recent practice${inactive > 0 ? ` (${inactive} marked inactive)` : ""}`,
      priority: "High",
      icon: "attention",
      tone: "danger",
      href: "/academy/students",
    });
  }

  const lowPerformers = students.filter(
    (s) => s.status === "active" && s.readiness !== null && s.readiness < LOW_READINESS_THRESHOLD,
  ).length;
  if (lowPerformers > 0) {
    tasks.push({
      id: "low-performance",
      title: "Low Performance Alert",
      description: `${plural(lowPerformers, "student")} below ${LOW_READINESS_THRESHOLD}% readiness`,
      priority: "High",
      icon: "readiness",
      tone: "warning",
      href: "/academy/students",
    });
  }

  // Alerts carry the existing business rules (unassigned batches, pending
  // invites) — reuse their wording rather than re-deriving it here.
  data.alerts.forEach((alert, index) => {
    const isBatchAlert = alert.message.toLowerCase().includes("batch");
    tasks.push({
      id: `alert-${index}`,
      title: isBatchAlert ? "Assign a Mentor" : "Follow Up on Mentor Invites",
      description: alert.message,
      priority: "Medium",
      icon: isBatchAlert ? "batches" : "mentors",
      tone: "indigo",
      href: isBatchAlert ? "/academy/batches" : "/academy/mentors",
    });
  });

  return tasks;
}

function buildActivity(students: AcademyStudent[]): DashboardActivity[] {
  return students
    .filter((s): s is AcademyStudent & { lastActivityAt: string } => s.lastActivityAt !== null)
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
    .slice(0, ACTIVITY_LIMIT)
    .map((s) => ({
      studentId: s.id,
      fullName: s.fullName,
      description: "Last practice activity",
      occurredAt: s.lastActivityAt,
      badge: s.status === "active" ? { label: "Active", tone: "success" } : { label: "Inactive", tone: "neutral" },
    }));
}

export function buildDashboardViewModel(
  data: AcademyDashboardData,
  students: AcademyStudent[],
  mentors: AcademyMentor[],
): DashboardViewModel {
  return {
    metrics: buildMetrics(data, students, mentors),
    tasks: buildTasks(data, students, mentors),
    activity: buildActivity(students),
  };
}
