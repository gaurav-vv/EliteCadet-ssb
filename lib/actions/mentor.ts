"use server";

// Mentor profile — thin entry point over lib/server.

import { revalidatePath } from "next/cache";
import { saveMentorProfile } from "@/lib/server/mentor/profile";
import type { MentorProfileInput } from "@/types/mentor";

export async function saveMentorProfileAction(input: Partial<Record<keyof MentorProfileInput, unknown>>) {
  const result = await saveMentorProfile(input);
  if (result.ok) revalidatePath("/mentor", "layout");
  return result;
}
