import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Users } from "lucide-react";
import { Pagination } from "@/components/academy/shared/pagination";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AddStudentDialog } from "@/components/academy/students/add-student-dialog";
import { StudentStats } from "@/components/academy/students/student-stats";
import { StudentTable } from "@/components/academy/students/student-table";
import { StudentToolbar } from "@/components/academy/students/student-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getAcademyBatchOptions } from "@/lib/api/batches";
import { getAcademyStudents } from "@/lib/server/academy-people/service";
import { buildStudentHref, parseStudentParams } from "@/lib/server/academy-people/validation";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseStudentParams(await searchParams);
  const [result, batchesResult] = await Promise.all([getAcademyStudents(params), getAcademyBatchOptions()]);

  if (!result.ok || !result.data || !batchesResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Students" subtitle="Your academy's students and their batches." />
        <RetryErrorState message={result.error?.message ?? batchesResult.error?.message ?? "We couldn't load your students. Please try again."} />
      </div>
    );
  }

  const { list, summary } = result.data;
  const batches = batchesResult.data ?? [];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader title="Students" subtitle="Your academy's students and their batches." primaryAction={<AddStudentDialog />} />

      <StudentStats summary={summary} />

      {summary.total === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState
            icon={<Users aria-hidden="true" size={22} />}
            title="No students yet"
            description="Add your first student by email; new people get an invite."
            action={<AddStudentDialog variant="inline" />}
          />
        </div>
      ) : (
        <section aria-label="Student list" className="flex flex-col gap-4">
          <StudentToolbar params={params} batches={batches} />
          <div className="glass-regular rounded-card p-2 sm:p-4">
            {list.total === 0 ? (
              <EmptyState
                icon={<SearchX aria-hidden="true" size={22} />}
                title="No students match your filters"
                description="Try a different search or clear the filters."
                action={<Link href="/academy/students" className="text-[13px] font-medium text-brand-accent hover:underline">Clear filters</Link>}
              />
            ) : (
              <StudentTable rows={list.rows} batches={batches} />
            )}
            <Pagination page={list.page} pageCount={list.pageCount} pageSize={list.pageSize} total={list.total} buildHref={(page) => buildStudentHref({ ...params, page })} noun={{ one: "student", many: "students" }} />
          </div>
        </section>
      )}
    </div>
  );
}
