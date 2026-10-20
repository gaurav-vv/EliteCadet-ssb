// Demo requests from the public landing page. Anyone may submit one; RLS
// (0016_demo_requests.sql) allows INSERT only, so nothing here can read
// another visitor's request back.

import { validateDemoRequest, type DemoFieldErrors } from "@/lib/server/demo-requests/validation";
import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "@/lib/server/users/service";
import type { DemoRequestInput } from "@/types/demo-requests";

type Result = ServiceResult<null> & { fieldErrors?: DemoFieldErrors };

export async function submitDemoRequest(input: Partial<Record<keyof DemoRequestInput, unknown>>): Promise<Result> {
  const checked = validateDemoRequest(input);
  if (!checked.ok) {
    return { ok: false, error: { code: "validation_error", message: "Please check the highlighted fields." }, fieldErrors: checked.fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("demo_requests").insert(checked.value);
  if (error) {
    // 42P01/PGRST205: 0016 isn't applied in this database yet.
    if (error.code === "42P01" || error.code === "PGRST205") {
      console.error("[demo-requests] table missing — apply supabase/migrations/0016_demo_requests.sql");
      return { ok: false, error: { code: "not_set_up", message: "Demo requests aren't available right now. Please try again later." } };
    }
    console.error("[demo-requests] insert failed", { code: error.code });
    return { ok: false, error: { code: "server_error", message: "We couldn't send your request. Please try again." } };
  }
  return { ok: true, data: null };
}
