import type { AiFeedbackState } from "@/types/ai";

export type InterviewMode = "guided" | "topic" | "mock";
export type FollowUpType = "clarification" | "evidence" | "depth" | "consistency" | "reflection";

export interface InterviewTopic {
  slug: string;
  title: string;
}

export interface InterviewTurn {
  id: string;
  seq: number;
  question: string;
  kind: "opening" | "follow_up" | "new_topic" | "bank";
  followUpType: FollowUpType | null;
  answer: string | null;
  answeredAt: string | null;
}

export interface InterviewView {
  id: string;
  mode: InterviewMode;
  topic: string | null;
  maxQuestions: number;
  status: "active" | "completed";
  createdAt: string;
  turns: InterviewTurn[];
  /** active + last question answered: the next question is being prepared, since this time. */
  waitingSince: string | null;
  feedback: AiFeedbackState;
}

export interface InterviewSummary {
  id: string;
  mode: InterviewMode;
  topic: string | null;
  status: "active" | "completed";
  answered: number;
  maxQuestions: number;
  createdAt: string;
  feedback: AiFeedbackState["status"];
}
