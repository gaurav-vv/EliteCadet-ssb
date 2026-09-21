import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/redirect";
import { DEV_PREVIEW_ACCOUNTS, DEV_PREVIEW_PASSWORD, isDevPreviewEnabled } from "@/lib/auth/dev-preview";
import type { Role } from "@/types/auth";

// Dev-only entry point for the landing page's "Preview (no login yet)"
// buttons. Signs the browser into a fixed seeded account per role so testing
// doesn't require repeating signup/login — never available in production,
// and never bypasses the real middleware/role checks (a genuine session is
// created, so every downstream authorization check still runs normally).
export async function GET(request: Request, { params }: { params: Promise<{ role: string }> }) {
  const { origin } = new URL(request.url);

  if (!isDevPreviewEnabled()) {
    return NextResponse.redirect(`${origin}/`);
  }

  const { role } = await params;
  const account = DEV_PREVIEW_ACCOUNTS[role as Role];
  if (!account) {
    return NextResponse.redirect(`${origin}/`);
  }

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email: account.email,
    password: DEV_PREVIEW_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      role,
      academy_name: account.academyName ?? null,
    },
  });

  const alreadyExists =
    createError && (createError.code === "email_exists" || createError.message.toLowerCase().includes("already"));

  if (createError && !alreadyExists) {
    return NextResponse.redirect(`${origin}/login?reason=link_invalid`);
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: DEV_PREVIEW_PASSWORD,
  });

  if (signInError) {
    return NextResponse.redirect(`${origin}/login?reason=link_invalid`);
  }

  return NextResponse.redirect(`${origin}${dashboardPathForRole(role)}`);
}
