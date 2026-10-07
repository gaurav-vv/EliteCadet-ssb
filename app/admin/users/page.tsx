import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { DataTable } from "@/components/academy/shared/data-table";
import { Pagination } from "@/components/academy/shared/pagination";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { RoleTag, UserStatusTag } from "@/components/admin/users/user-tags";
import { UserToolbar } from "@/components/admin/users/user-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getUserList } from "@/lib/server/users/service";
import { buildUserListQuery, parseUserListParams } from "@/lib/server/users/validation";
import { formatDay } from "@/lib/utils/format-date";

export const metadata: Metadata = { title: "User Management" };

const muted = (text: string) => <span className="text-ink-secondary">{text}</span>;

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseUserListParams(await searchParams);
  const result = await getUserList(params);

  return (
    <div className="flex flex-col gap-6 pb-10 lg:gap-8">
      <PageHeader title="User Management" subtitle="Every student, mentor, academy admin and super admin on the platform." />

      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load users. Please try again."} />
      ) : (
        <section aria-label="User list" className="flex flex-col gap-4">
          <UserToolbar params={params} />
          <div className="glass-regular rounded-card p-2 sm:p-4">
            {result.data.total === 0 ? (
              <EmptyState
                icon={<SearchX aria-hidden="true" size={22} />}
                title="No users match your filters"
                description="Try a different search or clear the filters."
                action={
                  <Link href="/admin/users" className="text-[13px] text-brand-accent">
                    Clear filters
                  </Link>
                }
              />
            ) : (
              <>
                <DataTable
                  caption="Users"
                  rows={result.data.rows}
                  getRowKey={(u) => u.id}
                  getRowHref={(u) => `/admin/users/${u.id}`}
                  columns={[
                    {
                      key: "user",
                      header: "User",
                      cell: (u) => (
                        <span className="flex min-w-0 flex-col text-left">
                          <span className="text-ink">{u.fullName || "Unnamed account"}</span>
                          <span className="text-[12px] text-ink-secondary">{u.email ?? "No email"}</span>
                        </span>
                      ),
                    },
                    { key: "role", header: "Role", cell: (u) => <RoleTag role={u.role} /> },
                    { key: "academy", header: "Academy", cell: (u) => u.academyName ?? muted("None") },
                    { key: "status", header: "Status", cell: (u) => <UserStatusTag status={u.status} /> },
                    { key: "login", header: "Last login", cell: (u) => formatDay(u.lastLoginAt) ?? muted("Never") },
                    { key: "joined", header: "Joined", cell: (u) => formatDay(u.createdAt) },
                  ]}
                />
                <Pagination
                  page={result.data.page}
                  pageCount={result.data.pageCount}
                  pageSize={result.data.pageSize}
                  total={result.data.total}
                  buildHref={(page) => `/admin/users${buildUserListQuery({ ...params, page })}`}
                  noun={{ one: "user", many: "users" }}
                />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
