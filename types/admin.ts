// Contract for admin (content-management) access — supabase/migrations/0004_admin_access.sql.

export type AdminArea = "super" | "student_content" | "mentor_content" | "academy_content";

// What a /admin route needs: any grant at all, or one specific area.
export type AdminRequirement = "any" | AdminArea;

export interface AdminGrant {
  userId: string;
  email: string;
  fullName: string;
  area: AdminArea;
  createdAt: string;
}

export interface GrantInput {
  email: string;
  area: AdminArea;
}
