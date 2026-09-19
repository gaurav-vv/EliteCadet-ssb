import type { Metadata } from "next";
import { CapsuleSecondary } from "@/components/ui/capsule";

export const metadata: Metadata = { title: "Practice" };

export default function PracticePage() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Practice</h1>
        <p className="text-sm text-text-muted">Choose a category to start practicing.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CapsuleSecondary
          href="/student/practice/psychology"
          icon="psychology"
          label="Psychology"
          description="TAT, WAT, SRT and SDT"
        />
        <CapsuleSecondary
          href="/student/practice/interview"
          icon="interview"
          label="Interview"
          description="Coming soon"
        />
      </div>
    </div>
  );
}
