import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateBatchForm } from "@/components/academy/create-batch-form";
import { getBatches, getMentorName } from "@/lib/api/academy";

export const metadata: Metadata = { title: "Batches" };

export default async function BatchesPage() {
  const result = await getBatches();
  const batches = result.data ?? [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Batches</h1>
        <p className="text-sm text-text-muted">{batches.length} batches in your academy.</p>
      </div>

      <CreateBatchForm />

      {batches.length === 0 ? (
        <EmptyState title="No batches yet" description="Create your first batch above." />
      ) : (
        <ul className="flex flex-col gap-2">
          {batches.map((batch) => (
            <li key={batch.id}>
              <Link
                href={`/academy/batches/${batch.id}`}
                className="glass-surface flex items-center justify-between px-5 py-4 no-underline hover:-translate-y-0.5 hover:scale-[1.01]"
              >
                <span className="text-sm font-medium text-text-primary">{batch.name}</span>
                <span className="text-xs text-text-muted">
                  {batch.studentIds.length} students · Mentor: {getMentorName(batch.mentorId)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
