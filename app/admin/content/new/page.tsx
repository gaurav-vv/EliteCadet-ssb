import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ContentForm } from "@/components/admin/content/content-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Add content" };

export default function NewContentPage() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/admin/content" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Content Library
      </Link>
      <PageHeader title="Add content" subtitle="It's saved as a draft. Publish it when it's ready for students or mentors." />
      <ContentForm />
    </div>
  );
}
