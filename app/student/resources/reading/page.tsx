import type { Metadata } from "next";
import { ReadingView } from "@/components/student/resources/views/reading-view";

export const metadata: Metadata = { title: "Recommended Reading · Resources" };

export default function ReadingPage() {
  return ReadingView({ audience: "student" });
}
