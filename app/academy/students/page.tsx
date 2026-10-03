import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Users } from "lucide-react";
import { AddStudentDialog } from "@/components/academy/students/add-student-dialog";
import { Pagination } from "@/components/academy/shared/pagination";
import { StudentStats } from "@/components/academy/students/student-stats";
import { StudentTable } from "@/components/academy/students/student-table";
import { StudentToolbar } from "@/components/academy/students/student-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { getBatches, getDashboardData, getMentors, getStudents } from "@/lib/api/academy";
import { buildStudentListHref, buildStudentRows, parseStudentListParams, queryStudents, summarizeStudents } from "@/lib/academy/student-list";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseStudentListParams(await searchParams);

  // Independent reads in parallel. The dashboard read supplies the existing
  // "needs attention" rule so both pages agree on who is flagged.
  const [studentsResult, batchesResult, mentorsResult, dashboardResult] = await Promise.all([
    getStudents(),
    getBatches(),
    getMentors(),
    getDashboardData(),
  ]);

  if (!studentsResult.data || !batchesResult.data || !mentorsResult.data || !dashboardResult.data) {
    return <ErrorState message="We couldn't load your students. Please refresh the page to try again." />;
  }

  const batches = batchesResult.data.map(({ id, name }) => ({ id, name }));
  const mentors = mentorsResult.data.map((m) => ({ id: m.id, name: m.fullName }));

  const allRows = buildStudentRows(studentsResult.data, batchesResult.data, mentorsResult.data, dashboardResult.data.attentionStudents);
  const summary = summarizeStudents(allRows);
  const result = queryStudents(allRows, params);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Students"
        subtitle="Manage students, batches, performance and activity."
        primaryAction={<AddStudentDialog batches={batches} />}
      />

      <StudentStats summary={summary} />

      {allRows.length === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState
            icon={<Users aria-hidden="true" size={22} />}
            title="No students yet"
            description="Add your first student to start tracking their preparation."
            action={<AddStudentDialog batches={batches} variant="inline" />}
          />
        </div>
      ) : (
        <section aria-label="Student list" className="flex flex-col gap-4">
          <StudentToolbar params={params} batches={batches} mentors={mentors} />

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
