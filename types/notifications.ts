export type NotificationKind =
  | "session_scheduled"
  | "session_cancelled"
  | "assessment_published"
  | "submission_received"
  | "feedback_reviewed"
  | "batch_assigned"
  | "content_request_new"
  | "content_request_update";

export interface NotificationRecord {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  items: NotificationRecord[];
  unread: number;
}
