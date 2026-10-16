import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { blockedReason } from "@/lib/auth/blocked";
import type { Role } from "@/types/auth";

// Exported for unit testing (tests/unit/lib/middleware-role.test.ts) — the
// route→role mapping is the entire authorization surface of the middleware,
// so it's tested directly rather than only indirectly through updateSession.
export function roleForPath(pathname: string): Role | null {
  // Anchored, unlike the older prefixes below (see the KNOWN GAP test).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "super_admin";
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
  if (!requiredRole) {
    return response;
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    redirectUrl.searchParams.set("reason", "login_required");
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, academy:academies!profiles_academy_id_fkey(status)")
    .eq("id", user.id)
    .single();
  const actualRole = profile?.role as Role | undefined;
  const reason = blockedReason(profile);

  // A suspended account, or any non-super-admin member of a suspended
  // academy, is signed out on its next request, whatever the route.
  if (reason) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("reason", reason);
    const redirect = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (!actualRole || actualRole !== requiredRole) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/forbidden";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
