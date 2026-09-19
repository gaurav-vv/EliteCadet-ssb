import type { Metadata } from "next";
import { ComingSoon } from "@/components/student/coming-soon";

export const metadata: Metadata = { title: "Interview" };

export default function InterviewPracticePage() {
  return (
    <ComingSoon
      title="Interview practice is coming soon"
      description="Interview scenarios haven't been defined in the product spec yet — Psychology tests are available now."
    />
  );
}
