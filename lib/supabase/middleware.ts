import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adminRequirementForPath, canAccess, isAdminArea } from "@/lib/admin/access";

type Role = "student" | "mentor" | "academy_admin";

// Exported for unit testing (tests/unit/lib/middleware-role.test.ts) — the
// route→role mapping is the entire authorization surface of the middleware,
// so it's tested directly rather than only indirectly through updateSession.
export function roleForPath(pathname: string): Role | null {
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/") || pathname.startsWith("/student")) {
    return "student";
  }
  if (pathname.startsWith("/mentor")) return "mentor";
  if (pathname.startsWith("/academy")) return "academy_admin";
  return null;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requiredRole = roleForPath(request.nextUrl.pathname);
  const adminRequirement = adminRequirementForPath(request.nextUrl.pathname);
  if (!requiredRole && !adminRequirement) {
    return response;
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    redirectUrl.searchParams.set("reason", "login_required");
    return NextResponse.redirect(redirectUrl);
  }

  // /admin is gated by admin_grants (supabase/migrations/0004_admin_access.sql),
  // not by profiles.role — content access is independent of the user's role.
  if (adminRequirement) {
    const { data: rows } = await supabase.from("admin_grants").select("area").eq("user_id", user.id);
    const grants = (rows ?? []).map((r) => r.area).filter(isAdminArea);
    if (!canAccess(grants, adminRequirement)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/forbidden";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const actualRole = profile?.role as Role | undefined;

  if (!actualRole || actualRole !== requiredRole) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/forbidden";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
