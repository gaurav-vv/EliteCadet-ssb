import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Users } from "lucide-react";
import { Pagination } from "@/components/academy/shared/pagination";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StudentTable } from "@/components/academy/students/student-table";
import { StudentToolbar } from "@/components/academy/students/student-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getMyMentees } from "@/lib/server/academy-people/service";
import { buildStudentQuery, hasActiveStudentFilters, parseStudentParams } from "@/lib/server/academy-people/validation";

export const metadata: Metadata = { title: "Mentees" };

// Exactly the students in the batches this mentor is assigned to — scoped on
// the server and by RLS (supabase/migrations/0007_batch_membership.sql).
export default async function MenteesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseStudentParams(await searchParams);
  const result = await getMyMentees(params);

  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Mentees" subtitle="Students in the batches you're assigned to." />
        <RetryErrorState message={result.error?.message ?? "We couldn't load your mentees. Please try again."} />
      </div>
    );
  }

  const { list, batches } = result.data;
  const subtitle =
    batches.length === 0 ? "Students in the batches you're assigned to." : `Your batches: ${batches.map((b) => b.name).join(", ")}.`;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Mentees" subtitle={subtitle} />

      {batches.length === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<Users aria-hidden="true" size={22} />} title="You're not on a batch yet" description="Your academy admin assigns mentors to batches; their students will appear here." />
        </div>
      ) : list.total === 0 && !hasActiveStudentFilters(params) ? (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<Users aria-hidden="true" size={22} />} title="No students in your batches yet" description="Students your academy admin adds to your batches will appear here." />
        </div>
      ) : (
        <section aria-label="Mentee list" className="flex flex-col gap-4">
          <StudentToolbar params={params} batches={batches} searchLabel="Search mentees by name or email" />
          <div className="glass-regular rounded-card p-2 sm:p-4">
            {list.total === 0 ? (
              <EmptyState
                icon={<SearchX aria-hidden="true" size={22} />}
                title="No mentees match your filters"
                description="Try a different search or clear the filters."
                action={<Link href="/mentor/mentees" className="text-[13px] font-medium text-brand-accent hover:underline">Clear filters</Link>}
              />
            ) : (
              <StudentTable rows={list.rows} batches={batches} hrefBase="/mentor/mentees" showActions={false} />
            )}
            <Pagination page={list.page} pageCount={list.pageCount} pageSize={list.pageSize} total={list.total} buildHref={(page) => `/mentor/mentees${buildStudentQuery({ ...params, page })}`} noun={{ one: "mentee", many: "mentees" }} />
          </div>
        </section>
      )}
    </div>
  );
}
