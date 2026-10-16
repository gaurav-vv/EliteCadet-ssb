import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PracticeItemForm } from "@/components/admin/practice/item-form";
import { PracticeItemList } from "@/components/admin/practice/item-list";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getBankAdmin } from "@/lib/server/practice/service";

export const metadata: Metadata = { title: "Practice Bank" };

export default async function PracticeBankPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getBankAdmin(slug);
  if (!result.ok && result.error?.code === "not_found") notFound();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/admin/practice" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Practice Banks
      </Link>
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load this bank. Please try again."} />
      ) : (
        <>
          <PageHeader
            title={result.data.bank.title}
            subtitle={`${result.data.bank.active} questions students see${result.data.bank.inactive ? `, ${result.data.bank.inactive} hidden` : ""}. Hiding a question keeps students' saved answers.`}
          />
          <section aria-labelledby="add-heading" className="glass-regular flex flex-col gap-4 rounded-card p-6">
            <h2 id="add-heading" className="text-[18px] font-semibold text-ink">
              Add a question
            </h2>
            <PracticeItemForm slug={slug} kind={result.data.bank.kind} />
          </section>
          <section aria-labelledby="items-heading" className="flex flex-col gap-3">
            <h2 id="items-heading" className="text-[18px] font-semibold text-ink">
              Questions, in the order students see them
            </h2>
            {result.data.items.length === 0 ? (
              <div className="glass-regular rounded-card">
                <EmptyState title="No questions yet" description="Add the first one above." />
              </div>
            ) : (
              <PracticeItemList slug={slug} kind={result.data.bank.kind} items={result.data.items} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
