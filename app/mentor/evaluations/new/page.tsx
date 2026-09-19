import type { Metadata } from "next";
import Link from "next/link";
import { EvaluationForm } from "@/components/mentor/evaluation-form";
import { getMenteeOptions } from "@/lib/api/mentor";

export const metadata: Metadata = { title: "New Evaluation" };

export default async function NewEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ menteeId?: string }>;
}) {
  const { menteeId } = await searchParams;
  const result = await getMenteeOptions();
  const mentees = result.data ?? [];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 pb-10">
      <Link href="/mentor/evaluations" className="text-xs text-brand-navy hover:underline">
        ← Evaluations
      </Link>
      <h1 className="text-2xl font-semibold text-text-primary">New evaluation</h1>
      <EvaluationForm mentees={mentees} defaultMenteeId={menteeId} />
    </div>
  );
}
