export type StudentStatus = "active" | "inactive";
export type MentorStatus = "invited" | "active";

export interface AcademyStudent {
  id: string;
  fullName: string;
  batchId: string | null;
  mentorId: string | null;
  status: StudentStatus;
  readiness: number | null;
  lastActivityAt: string | null;
}

export interface AcademyBatch {
  id: string;
  name: string;
  mentorId: string | null;
  studentIds: string[];
}

export interface AcademyMentor {
  id: string;
  fullName: string;
  email: string;
  status: MentorStatus;
  sessionsThisWeek: number;
  pendingEvaluations: number;
}

export interface AttentionStudent {
  studentId: string;
  fullName: string;
  reason: string;
}

export interface AcademyAlert {
  message: string;
}

export interface BatchPerformanceRow {
  batchId: string;
  name: string;
  studentCount: number;
  averageReadiness: number | null;
}

export interface MentorOverviewRow {
  mentorId: string;
  fullName: string;
  status: MentorStatus;
  assignedStudentCount: number;
}

export interface AcademyDashboardData {
  academyName: string;
  totalStudents: number;
  activeBatches: number;
  totalMentors: number;
  averageReadiness: number | null;
  batchPerformance: BatchPerformanceRow[];
  mentorOverview: MentorOverviewRow[];
  attentionStudents: AttentionStudent[];
  alerts: AcademyAlert[];
}

export interface StudentInput {
  fullName: string;
  batchId: string | null;
}

export interface BatchInput {
  name: string;
}

export interface MentorInviteInput {
  fullName: string;
  email: string;
}

export interface AcademySettings {
  academyName: string;
  contactEmail: string;
  adminName: string;
}
