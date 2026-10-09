import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ContentForm } from "@/components/admin/content/content-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "New content" };

export default function NewMyContentPage() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/content" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        My Content
      </Link>
      <PageHeader title="New content" subtitle="Saved as a draft. Publish it, then share it with your batches." />
      <ContentForm mode="mentor" />
    </div>
  );
}
