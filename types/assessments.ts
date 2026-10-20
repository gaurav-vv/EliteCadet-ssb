// Contract for assessments, attempts and mentor feedback (Phase 7, T086) —
// specs.md §8a.4c. Backed by 0011_assessments.sql.

import type { ContentCategory } from "@/types/content";

export type AssessmentStatus = "draft" | "published" | "closed";
export type AttemptStatus = "draft" | "submitted";
export type FeedbackStatus = "in_review" | "reviewed";
// specs.md §4.4 evaluation vocabulary, derived per attempt.
export type EvaluationStatus = "pending" | "in_review" | "reviewed";

export interface AssessmentQuestion {
  id: string;
  prompt: string;
}

export interface AssessmentRecord {
  id: string;
  batchId: string;
  batchName: string | null;
  mentorId: string;
  mentorName: string | null;
  title: string;
  instructions: string | null;
  category: ContentCategory;
  questions: AssessmentQuestion[];
  maxScore: number;
  dueAt: string | null;
  status: AssessmentStatus;
  createdAt: string;
}

export interface AttemptAnswer {
  questionId: string;
  answer: string;
}

export interface FeedbackRecord {
  id: string;
  mentorName: string | null;
  score: number | null;
  strengths: string | null;
  improvementAreas: string | null;
  comments: string | null;
  status: FeedbackStatus;
  reviewedAt: string | null;
}

export interface AttemptRecord {
  id: string;
  assessmentId: string;
  studentId: string;
  studentName: string | null;
  answers: AttemptAnswer[];
  status: AttemptStatus;
  submittedAt: string | null;
  feedback: FeedbackRecord | null;
}

export interface AssessmentInput {
  batchId: string;
  title: string;
  instructions: string;
  category: string;
  questions: string[]; // prompts, in order
  maxScore: string;
  dueDate: string; // yyyy-mm-dd (IST) or ""
}

export interface FeedbackInput {
  score: string;
  strengths: string;
  improvementAreas: string;
  comments: string;
}

export const ASSESSMENT_STATUSES: Record<AssessmentStatus, string> = { draft: "Draft", published: "Open", closed: "Closed" };
export const EVALUATION_STATUSES: Record<EvaluationStatus, string> = { pending: "Pending review", in_review: "In review", reviewed: "Reviewed" };

export function evaluationStatusOf(attempt: Pick<AttemptRecord, "status" | "feedback">): EvaluationStatus | null {
  if (attempt.status !== "submitted") return null;
  if (!attempt.feedback) return "pending";
  return attempt.feedback.status === "reviewed" ? "reviewed" : "in_review";
}
