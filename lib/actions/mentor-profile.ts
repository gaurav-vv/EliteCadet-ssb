"use server";

// Thin entry point; the rules and authorization live in lib/server/mentor-profile/service.ts.

import { revalidatePath } from "next/cache";
import { saveMyMentorProfile } from "@/lib/server/mentor-profile/service";

export async function saveMentorProfileAction(input: { fullName: string; phone: string; bio: string; qualifications: string; specialization: string }) {
  const result = await saveMyMentorProfile(input);
  if (result.ok) {
    revalidatePath("/mentor");
    revalidatePath("/mentor/profile");
  }
  return result;
}
