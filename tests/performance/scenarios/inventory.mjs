// Route inventory: every static page per workspace (app/<role>/**/page.tsx without a
// dynamic segment). Read-only GET journeys only; pages that need an id are not listed.
export const ROUTES = {
  public: ["/", "/login", "/signup", "/request-demo", "/forgot-password"],
  student: ["/student", "/student/roadmap", "/student/practice", "/student/sessions", "/student/assessments", "/student/progress", "/student/resources", "/student/library", "/student/profile", "/student/notifications"],
  mentor: ["/mentor", "/mentor/mentees", "/mentor/assessments", "/mentor/evaluations", "/mentor/sessions", "/mentor/content", "/mentor/library", "/mentor/profile", "/mentor/notifications"],
  academy_admin: ["/academy", "/academy/students", "/academy/mentors", "/academy/batches", "/academy/assessments", "/academy/sessions", "/academy/performance", "/academy/reports", "/academy/library", "/academy/settings", "/academy/notifications"],
  super_admin: ["/admin", "/admin/users", "/admin/academies", "/admin/analytics", "/admin/content", "/admin/content-requests", "/admin/practice", "/admin/notifications"],
};

export const HOME = { student: "/student", mentor: "/mentor", academy_admin: "/academy", super_admin: "/admin" };
