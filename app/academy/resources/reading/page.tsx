import type { Metadata } from "next";
import { ReadingView } from "@/components/student/resources/views/reading-view";

export const metadata: Metadata = { title: "Recommended Reading · Resources" };

// Academy admins see the same Resources as students, read-only: the platform admin is the only one who provides them.
export default function ReadingPage() {
  return ReadingView({ audience: "academy" });
}
