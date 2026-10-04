import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Users } from "lucide-react";
import { Pagination } from "@/components/academy/shared/pagination";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AddStudentDialog } from "@/components/academy/students/student-form-dialog";
import { StudentStats } from "@/components/academy/students/student-stats";
import { StudentTable } from "@/components/academy/students/student-table";
import { StudentToolbar } from "@/components/academy/students/student-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getStudentBatchOptions, getStudentList, getStudentSummary } from "@/lib/api/students";
import { buildStudentListHref, parseStudentListParams } from "@/lib/academy/student-list";

export const metadata: Metadata = { title: "Students" };

const SUBTITLE = "Manage students enrolled in your academy.";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseStudentListParams(await searchParams);

  // Three independent reads (a page of students, whole-academy counts, batches),
  // all real Postgres queries run in parallel.
  const [listResult, summaryResult, batchesResult] = await Promise.all([
    getStudentList(params),
    getStudentSummary(),
    getStudentBatchOptions(),
  ]);

  // A failed read is shown as an error, never as an empty list.
  const failure = [listResult, summaryResult, batchesResult].find((r) => !r.ok || !r.data)?.error;
  if (failure || !listResult.data || !summaryResult.data || !batchesResult.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Students" subtitle={SUBTITLE} />
        <RetryErrorState message={failure?.message ?? "We couldn't load your students. Please try again."} />
      </div>
    );
  }

  const result = listResult.data;
  const summary = summaryResult.data;
  const batches = batchesResult.data;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader title="Students" subtitle={SUBTITLE} primaryAction={<AddStudentDialog batches={batches} />} />

      <StudentStats summary={summary} />

      {summary.total === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState
            icon={<Users aria-hidden="true" size={22} />}
            title="Your academy has no students yet."
            description="Add your first student to start tracking their preparation."
            action={<AddStudentDialog batches={batches} variant="inline" />}
          />
        </div>
      ) : (
        <section aria-label="Student list" className="flex flex-col gap-4">
          <StudentToolbar params={params} batches={batches} />

          <div className="glass-regular rounded-card p-2 sm:p-4">
            {result.total === 0 ? (
              <EmptyState
                icon={<SearchX aria-hidden="true" size={22} />}
                title="No students match your filters"
                description="Try a different search or clear the filters."
                action={
                  <Link href="/academy/students" className="text-[13px] font-medium text-brand-accent hover:underline">
                    Clear filters
                  </Link>
                }
              />
            ) : (
              <StudentTable rows={result.rows} batches={batches} />
            )}
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              pageSize={result.pageSize}
              total={result.total}
              buildHref={(page) => buildStudentListHref({ ...params, page })}
              noun={{ one: "student", many: "students" }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
