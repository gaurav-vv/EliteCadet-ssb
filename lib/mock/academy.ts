// MOCK DATA — isolated per AGENTS.md §8, same rationale as lib/mock/mentor.ts.
// No real academy-isolation/auth exists yet (deferred — status.md,
// 2026-09-19): every record here is visible to any visitor of /academy.

import type { AcademyBatch, AcademyMentor, AcademySettings, AcademyStudent, AttentionStudent } from "@/types/academy";

// Demo/fictional display defaults — only ever shown before "Load demo data"
// has been used, or as the reset target. A real academy admin's actual
// academy name/admin name come from Supabase (lib/auth/session.ts,
// lib/auth/update-profile.ts), not from here.
export const ACADEMY_NAME = "Horizon SSB Academy";
export const ADMIN_NAME = "Meera Kapoor";

// Mutable — updated in place by lib/actions/academy.ts (Server Actions).
export const SETTINGS: AcademySettings = {
  academyName: ACADEMY_NAME,
  contactEmail: "admin@horizonssb.example",
  adminName: ADMIN_NAME,
};

// Demo content only — the live arrays below start EMPTY, matching what a
// freshly-created real academy account should actually see. Populated only
// via "Load demo data" (lib/actions/academy.ts), which clones this into the
// live arrays; "Clear demo data" empties them again.
const DEMO_STUDENTS: AcademyStudent[] = [
  { id: "stu-1", fullName: "Priya Nair", batchId: "batch-a", mentorId: "mentor-1", status: "active", readiness: 74, lastActivityAt: "2026-09-17T09:00:00.000Z" },
  { id: "stu-2", fullName: "Rohit Verma", batchId: "batch-a", mentorId: "mentor-1", status: "active", readiness: 58, lastActivityAt: "2026-09-13T09:00:00.000Z" },
  { id: "stu-3", fullName: "Sneha Iyer", batchId: "batch-b", mentorId: "mentor-1", status: "active", readiness: null, lastActivityAt: null },
  { id: "stu-4", fullName: "Arjun Mehta", batchId: "batch-b", mentorId: "mentor-1", status: "active", readiness: 81, lastActivityAt: "2026-09-18T07:00:00.000Z" },
  { id: "stu-5", fullName: "Kavya Reddy", batchId: "batch-a", mentorId: "mentor-1", status: "active", readiness: 65, lastActivityAt: "2026-09-17T09:00:00.000Z" },
  { id: "stu-6", fullName: "Vikram Singh", batchId: "batch-c", mentorId: null, status: "active", readiness: 49, lastActivityAt: "2026-09-12T09:00:00.000Z" },
  { id: "stu-7", fullName: "Neha Joshi", batchId: "batch-c", mentorId: null, status: "active", readiness: 70, lastActivityAt: "2026-09-15T09:00:00.000Z" },
  { id: "stu-8", fullName: "Aman Gupta", batchId: "batch-b", mentorId: "mentor-1", status: "inactive", readiness: 55, lastActivityAt: "2026-08-29T09:00:00.000Z" },
];

const DEMO_BATCHES: AcademyBatch[] = [
  { id: "batch-a", name: "Batch A", mentorId: "mentor-1", studentIds: ["stu-1", "stu-2", "stu-5"] },
  { id: "batch-b", name: "Batch B", mentorId: "mentor-1", studentIds: ["stu-3", "stu-4", "stu-8"] },
  { id: "batch-c", name: "Batch C", mentorId: null, studentIds: ["stu-6", "stu-7"] },
];

const DEMO_MENTORS: AcademyMentor[] = [
  { id: "mentor-1", fullName: "Kavita Sharma", email: "kavita.sharma@example.com", status: "active", sessionsThisWeek: 3, pendingEvaluations: 2 },
  { id: "mentor-2", fullName: "Rahul Nair", email: "rahul.nair@example.com", status: "invited", sessionsThisWeek: 0, pendingEvaluations: 0 },
];

export const STUDENTS: AcademyStudent[] = [];
export const BATCHES: AcademyBatch[] = [];
export const MENTORS: AcademyMentor[] = [];

export function resetAcademyDemoData(): void {
  STUDENTS.splice(0, STUDENTS.length, ...DEMO_STUDENTS.map((s) => ({ ...s })));
  BATCHES.splice(0, BATCHES.length, ...DEMO_BATCHES.map((b) => ({ ...b, studentIds: [...b.studentIds] })));
  MENTORS.splice(0, MENTORS.length, ...DEMO_MENTORS.map((m) => ({ ...m })));
}

export function clearAcademyDemoData(): void {
  STUDENTS.splice(0, STUDENTS.length);
  BATCHES.splice(0, BATCHES.length);
  MENTORS.splice(0, MENTORS.length);
}

export function getStudent(id: string): AcademyStudent | undefined {
  return STUDENTS.find((s) => s.id === id);
}

export function getBatch(id: string): AcademyBatch | undefined {
  return BATCHES.find((b) => b.id === id);
}

export function getMentor(id: string): AcademyMentor | undefined {
  return MENTORS.find((m) => m.id === id);
}

// Called from app/mentor/layout.tsx (a Server Component, so this genuinely
// runs server-side) the first time an invited mentor's own dashboard loads,
// to flip their academy roster entry from "invited" to "active".
export function markMentorActive(id: string): void {
  const mentor = getMentor(id);
  if (mentor && mentor.status === "invited") {
    mentor.status = "active";
  }
}

export function getBatchName(batchId: string | null): string {
  if (!batchId) return "Unassigned";
  return getBatch(batchId)?.name ?? "Unassigned";
}

export function getMentorName(mentorId: string | null): string {
  if (!mentorId) return "Unassigned";
  return getMentor(mentorId)?.fullName ?? "Unassigned";
}

export function getMockDashboardData() {
  const activeStudents = STUDENTS.filter((s) => s.status === "active");
  const scored = activeStudents.filter((s) => s.readiness !== null);
  const averageReadiness =
    scored.length > 0 ? Math.round(scored.reduce((sum, s) => sum + (s.readiness ?? 0), 0) / scored.length) : null;

  const batchPerformance = BATCHES.map((batch) => {
    const students = batch.studentIds.map((id) => getStudent(id)).filter((s): s is AcademyStudent => Boolean(s));
    const batchScored = students.filter((s) => s.readiness !== null);
    return {
      batchId: batch.id,
      name: batch.name,
      studentCount: students.length,
      averageReadiness:
        batchScored.length > 0
          ? Math.round(batchScored.reduce((sum, s) => sum + (s.readiness ?? 0), 0) / batchScored.length)
          : null,
    };
  });

  const mentorOverview = MENTORS.map((mentor) => ({
    mentorId: mentor.id,
    fullName: mentor.fullName,
    status: mentor.status,
    assignedStudentCount: STUDENTS.filter((s) => s.mentorId === mentor.id).length,
  }));

  const alerts = [];
  const unassignedBatches = BATCHES.filter((b) => !b.mentorId);
  if (unassignedBatches.length > 0) {
    alerts.push({ message: `${unassignedBatches.map((b) => b.name).join(", ")} ${unassignedBatches.length > 1 ? "have" : "has"} no mentor assigned.` });
  }
  const pendingInvites = MENTORS.filter((m) => m.status === "invited").length;
  if (pendingInvites > 0) {
    alerts.push({ message: `${pendingInvites} mentor invitation${pendingInvites > 1 ? "s" : ""} pending acceptance.` });
  }

  return {
    academyName: ACADEMY_NAME,
    totalStudents: STUDENTS.length,
    activeBatches: BATCHES.length,
    totalMentors: MENTORS.length,
    averageReadiness,
    batchPerformance,
    mentorOverview,
    attentionStudents: getAttentionStudents(),
    alerts,
  };
}

export function getAttentionStudents(): AttentionStudent[] {
  const attention: AttentionStudent[] = [];
  const now = new Date("2026-09-19T09:00:00.000Z").getTime();

  for (const student of STUDENTS) {
    if (student.status === "inactive") {
      attention.push({ studentId: student.id, fullName: student.fullName, reason: "Marked inactive." });
      continue;
    }
    if (!student.lastActivityAt) {
      attention.push({ studentId: student.id, fullName: student.fullName, reason: "No practice activity since joining." });
      continue;
    }
    const daysSince = Math.floor((now - new Date(student.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 4) {
      attention.push({ studentId: student.id, fullName: student.fullName, reason: `No practice activity for ${daysSince} days.` });
    }
  }

  return attention;
}
