import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActivityDetail } from "@/lib/api/practice";
import { PracticeSession } from "@/components/practice/practice-session";
import type { PsychologyTestType } from "@/types/practice";

const VALID_TESTS: PsychologyTestType[] = ["tat", "wat", "srt", "sdt"];

function isValidTest(value: string): value is PsychologyTestType {
  return (VALID_TESTS as string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ test: string }>;
}): Promise<Metadata> {
  const { test } = await params;
  return { title: isValidTest(test) ? test.toUpperCase() : "Practice" };
}

export default async function PsychologyTestPage({
  params,
}: {
  params: Promise<{ test: string }>;
}) {
  const { test } = await params;
  if (!isValidTest(test)) {
    notFound();
  }

  const result = await getActivityDetail(test);
  if (!result.ok || !result.data) {
    notFound();
  }

  return (
    <PracticeSession testType={test} summary={result.data.summary} items={result.data.items} />
  );
}
