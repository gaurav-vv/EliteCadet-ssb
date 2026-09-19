import type { Metadata } from "next";
import Link from "next/link";
import { CapsuleSecondary } from "@/components/ui/capsule";
import { ErrorState } from "@/components/ui/error-state";
import { getActivities } from "@/lib/api/practice";

export const metadata: Metadata = { title: "Psychology" };

export default async function PsychologyPage() {
  const result = await getActivities();

  if (!result.ok || !result.data) {
    return <ErrorState message="We couldn't load the psychology tests. Please try again." />;
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href="/student/practice" className="text-xs text-brand-navy hover:underline">
          ← Practice
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">Psychology</h1>
        <p className="text-sm text-text-muted">
          Four tests, same format as the actual SSB screening. Read the instructions before you start.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {result.data.map((activity) => (
          <CapsuleSecondary
            key={activity.testType}
            href={`/student/practice/psychology/${activity.testType}`}
            icon="psychology"
            label={activity.title}
            description={`${activity.description} · ${activity.durationLabel}`}
          />
        ))}
      </div>
    </div>
  );
}
