// Contract for learning content (Phase 4, T083) — specs.md §8a.4.
// Backed by public.contents / content_assignments (0008_contents.sql).

export type ContentCategory = "psychology" | "gto" | "interview" | "communication" | "current_affairs" | "general";
export type ContentType = "study_material" | "video" | "document" | "article" | "practice_exercise" | "assessment" | "session_template" | "mock_activity";
export type ContentDifficulty = "easy" | "medium" | "hard";
export type ContentAudience = "student" | "mentor" | "both";
export type ContentVisibility = "everyone" | "assigned";
export type ContentStatus = "draft" | "published" | "archived";

export const CONTENT_CATEGORIES: Record<ContentCategory, string> = {
  psychology: "Psychology",
  gto: "GTO",
  interview: "Interview",
  communication: "Communication",
  current_affairs: "Current Affairs",
  general: "General",
};

export const CONTENT_TYPES: Record<ContentType, string> = {
  study_material: "Study material",
  video: "Video",
  document: "Document",
  article: "Article",
  practice_exercise: "Practice exercise",
  assessment: "Assessment",
  session_template: "Session template",
  mock_activity: "Mock SSB activity",
};

export const CONTENT_DIFFICULTIES: Record<ContentDifficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
export const CONTENT_AUDIENCES: Record<ContentAudience, string> = { student: "Students", mentor: "Mentors", both: "Students & mentors" };
export const CONTENT_VISIBILITIES: Record<ContentVisibility, string> = { everyone: "Everyone", assigned: "Assigned academies/batches only" };
export const CONTENT_STATUSES: Record<ContentStatus, string> = { draft: "Draft", published: "Published", archived: "Archived" };

export interface ContentRecord {
  id: string;
  title: string;
  description: string | null;
  category: ContentCategory;
  type: ContentType;
  difficulty: ContentDifficulty;
  targetRole: ContentAudience;
  visibility: ContentVisibility;
  status: ContentStatus;
  body: string | null;
  externalUrl: string | null;
  ownerType: "platform" | "mentor";
  isTemplate: boolean;
  templateSourceId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ContentInput {
  title: string;
  description: string;
  category: string;
  type: string;
  difficulty: string;
  targetRole: string;
  visibility: string;
  body: string;
  externalUrl: string;
  // Platform content only: offer it to mentors as a starter template.
  isTemplate?: boolean;
}

export interface ContentListParams {
  q: string;
  category: ContentCategory | "all";
  type: ContentType | "all";
  status: ContentStatus | "all";
  difficulty: ContentDifficulty | "all";
  page: number;
}

export interface ContentListResult {
  rows: ContentRecord[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
}

export type ContentCategoryCounts = Record<ContentCategory | "all", number>;

export interface ContentAssignment {
  id: string;
  academyId: string | null;
  batchId: string | null;
  label: string;
}

// ---- Content requests (Phase 5, specs.md §8a.4) -----------------------------

export type ContentRequestStatus = "requested" | "quoted" | "accepted" | "declined" | "in_progress" | "delivered" | "cancelled";
export type SettlementStatus = "not_due" | "owed" | "settled";

export const REQUEST_STATUSES: Record<ContentRequestStatus, string> = {
  requested: "Requested",
  quoted: "Quote sent",
  accepted: "Accepted",
  declined: "Declined",
  in_progress: "In progress",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const SETTLEMENT_STATUSES: Record<SettlementStatus, string> = { not_due: "No fee due", owed: "Fee owed", settled: "Settled" };

export interface ContentRequest {
  id: string;
  mentorId: string;
  mentorName: string | null;
  academyName: string | null;
  title: string;
  details: string;
  category: ContentCategory;
  type: ContentType;
  neededBy: string | null;
  status: ContentRequestStatus;
  quotedFeeInr: number | null;
  quoteNote: string | null;
  deliveredContentId: string | null;
  settlement: SettlementStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContentRequestInput {
  title: string;
  details: string;
  category: string;
  type: string;
  neededBy: string;
}
