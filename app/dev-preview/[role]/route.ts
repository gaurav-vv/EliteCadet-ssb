import { NextResponse } from "next/server";
import { AdminClientConfigError, createAdminClient, missingAdminConfig } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loadAccountAccess } from "@/lib/auth/account";
import { dashboardPathForRole } from "@/lib/auth/redirect";
import { DEV_PREVIEW_ACCOUNTS, devPreviewConfigProblems, devPreviewPassword, isDevPreviewEnabled } from "@/lib/auth/dev-preview";
import type { Role } from "@/types/auth";

// Dev-only entry point for the landing page's "Preview (no login yet)"
// buttons. Signs the browser into a fixed seeded account per role so testing
// doesn't require repeating signup/login — never available in production,
// and never bypasses the real middleware/role checks (a genuine session is
// created, so every downstream authorization check still runs normally).

// Plain-text explanation for the developer running the app locally. Names
// variables, never prints their values.
function devError(status: number, message: string) {
  return new NextResponse(`Dev preview unavailable: ${message}\n`, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ role: string }> }) {
  const { origin } = new URL(request.url);

  if (!isDevPreviewEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const { role } = await params;
  if (!Object.hasOwn(DEV_PREVIEW_ACCOUNTS, role)) {
    return new NextResponse(null, { status: 404 });
  }
  const account = DEV_PREVIEW_ACCOUNTS[role as Role];

  const problems = [...missingAdminConfig(), ...devPreviewConfigProblems()];
  if (problems.length > 0) {
    return devError(
      503,
      `set ${problems.join(" and ")} in .env.local (server-side only, never NEXT_PUBLIC_), then restart the dev server. See .env.example.`,
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    if (error instanceof AdminClientConfigError) return devError(503, error.message);
    throw error;
  }

  const password = devPreviewPassword();
  const { error: createError } = await admin.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      academy_name: account.academyName ?? null,
    },
    // app_metadata is service-role-only, so the signup trigger trusts the role
    // from here (supabase/migrations/0005_users_rbac.sql), never from user_metadata.
    app_metadata: { role },
  });

  const alreadyExists =
    createError && (createError.code === "email_exists" || createError.message.toLowerCase().includes("already"));

  if (createError && !alreadyExists) {
    console.error("[dev-preview] could not create preview account", { role, code: createError.code });
    return devError(502, `Supabase refused to create the ${role} preview account (${createError.code ?? "unknown error"}).`);
  }

  const supabase = await createClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: account.email, password });

  if (signInError || !data.user) {
    return devError(
      409,
      `the ${role} preview account exists but DEV_PREVIEW_PASSWORD doesn't match it. Reset that account's password in the Supabase dashboard, or delete it so it is recreated.`,
    );
  }

  // An account created before the RBAC migrations (or by hand) may hold a
  // different role; say so instead of landing on /forbidden.
  const access = await loadAccountAccess(supabase, data.user.id);
  if (access.kind !== "ok" || access.role !== role) {
    await supabase.auth.signOut();
    const found = access.kind === "ok" ? `role "${access.role}"` : access.kind.replace("_", " ");
    return devError(409, `the ${role} preview account has ${found}, not "${role}". Check that migrations 0005+ are applied and fix the account's profile.`);
  }

  return NextResponse.redirect(`${origin}${dashboardPathForRole(role)}`);
}
