import type { Metadata } from "next";
import Link from "next/link";
import { Building2, SearchX } from "lucide-react";
import { DataTable } from "@/components/academy/shared/data-table";
import { Pagination } from "@/components/academy/shared/pagination";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AcademyFormDialog } from "@/components/admin/academies/academy-form-dialog";
import { AcademyStatusTag } from "@/components/admin/academies/academy-status-tag";
import { AcademyToolbar } from "@/components/admin/academies/academy-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getAcademyList } from "@/lib/server/academies/service";
import { buildAcademyListQuery, hasActiveAcademyFilters, parseAcademyListParams } from "@/lib/server/academies/validation";
import { formatDay } from "@/lib/utils/format-date";

export const metadata: Metadata = { title: "Academies" };

export default async function AcademiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseAcademyListParams(await searchParams);
  const result = await getAcademyList(params);

  return (
    <div className="flex flex-col gap-6 pb-10 lg:gap-8">
      <PageHeader title="Academies" subtitle="Every academy on the platform, its status and its members." primaryAction={<AcademyFormDialog />} />

      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load academies. Please try again."} />
      ) : result.data.total === 0 && !hasActiveAcademyFilters(params) ? (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<Building2 aria-hidden="true" size={22} />} title="No academies yet" description="Create the first academy, then add its admins, mentors and students." />
        </div>
      ) : (
        <section aria-label="Academy list" className="flex flex-col gap-4">
          <AcademyToolbar params={params} />
          <div className="glass-regular rounded-card p-2 sm:p-4">
            {result.data.total === 0 ? (
              <EmptyState
                icon={<SearchX aria-hidden="true" size={22} />}
                title="No academies match your filters"
                description="Try a different search or clear the filters."
                action={<Link href="/admin/academies" className="text-[13px] text-brand-accent">Clear filters</Link>}
              />
            ) : (
              <>
                <DataTable
                  caption="Academies"
                  rows={result.data.rows}
                  getRowKey={(a) => a.id}
                  getRowHref={(a) => `/admin/academies/${a.id}`}
                  columns={[
                    {
                      key: "academy",
                      header: "Academy",
                      cell: (a) => (
                        <span className="flex min-w-0 flex-col text-left">
                          <span className="text-ink">{a.name}</span>
                          <span className="text-[12px] text-ink-secondary">{a.contactEmail ?? "No contact email"}</span>
                        </span>
                      ),
                    },
                    { key: "status", header: "Status", cell: (a) => <AcademyStatusTag status={a.status} /> },
                    { key: "admins", header: "Admins", cell: (a) => a.counts.admins },
                    { key: "mentors", header: "Mentors", cell: (a) => a.counts.mentors },
                    { key: "students", header: "Students", cell: (a) => a.counts.students },
                    { key: "created", header: "Created", cell: (a) => formatDay(a.createdAt) },
                  ]}
                />
                <Pagination
                  page={result.data.page}
                  pageCount={result.data.pageCount}
                  pageSize={result.data.pageSize}
                  total={result.data.total}
                  buildHref={(page) => `/admin/academies${buildAcademyListQuery({ ...params, page })}`}
                  noun={{ one: "academy", many: "academies" }}
                />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
