"use server";

// Demo request Server Action — thin entry point; rules live in
// lib/server/demo-requests/service.ts.

import * as service from "@/lib/server/demo-requests/service";
import type { DemoRequestInput } from "@/types/demo-requests";

export async function submitDemoRequestAction(input: Partial<Record<keyof DemoRequestInput, unknown>>) {
  return service.submitDemoRequest(input);
}
