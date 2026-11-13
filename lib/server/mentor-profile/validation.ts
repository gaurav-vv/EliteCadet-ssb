// Pure rules for a mentor's own profile (no I/O; tests/unit/lib/mentor-profile.test.ts). The limits match
// the database (mentor_profiles_qualifications_length, 0027) and the Add Mentor form.

import { PHONE_RE } from "@/lib/server/academy-people/validation";

export type MentorProfileField = "fullName" | "phone" | "bio" | "qualifications" | "specialization";

export interface MentorProfileValues {
  fullName: string;
  phone: string | null;
  bio: string | null;
  qualifications: string | null;
  specialization: string[];
}

export type MentorProfileCheck = { ok: true; values: MentorProfileValues } | { ok: false; field: MentorProfileField; message: string };

const text = (v: unknown) => (typeof v === "string" ? v.trim().replace(/[ \t]+/g, " ") : "");

export function checkMentorProfileInput(input: { fullName?: unknown; phone?: unknown; bio?: unknown; qualifications?: unknown; specialization?: unknown }): MentorProfileCheck {
  const fullName = text(input.fullName);
  if (!fullName) return { ok: false, field: "fullName", message: "Your name is required." };
  if (fullName.length > 100) return { ok: false, field: "fullName", message: "Keep your name under 100 characters." };
  const phone = text(input.phone);
  if (phone && !PHONE_RE.test(phone)) return { ok: false, field: "phone", message: "Enter a phone number of 7–20 digits (spaces, +, - and brackets are fine), or leave it empty." };
  const bio = typeof input.bio === "string" ? input.bio.trim() : "";
  if (bio.length > 1000) return { ok: false, field: "bio", message: "Keep your bio under 1,000 characters." };
  const qualifications = text(input.qualifications);
  if (qualifications.length > 500) return { ok: false, field: "qualifications", message: "Keep qualifications under 500 characters." };
  const specialization = [...new Set(text(input.specialization).split(",").map((s) => s.trim()).filter(Boolean))];
  if (specialization.length > 10 || specialization.some((s) => s.length > 60)) {
    return { ok: false, field: "specialization", message: "Up to 10 specializations, each under 60 characters, separated by commas." };
  }
  return { ok: true, values: { fullName, phone: phone || null, bio: bio || null, qualifications: qualifications || null, specialization } };
}

// A profile counts as complete once the details mentees and admins rely on are filled in.
export function isMentorProfileComplete(p: { bio: string | null; qualifications: string | null; specialization: string[] }): boolean {
  return Boolean(p.bio) && Boolean(p.qualifications) && p.specialization.length > 0;
}
