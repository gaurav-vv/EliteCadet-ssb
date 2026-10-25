import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ClipboardCheck, FileDown, FileText, NotebookPen, CalendarRange, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryTag } from "@/components/student/resources/resource-ui";
import { getPrintables, getResources } from "@/lib/api/resources";
import { RESOURCE_CATEGORIES, type PrintableDoc } from "@/types/resources";

export const metadata: Metadata = { title: "Downloadable PDFs · Resources" };

const KIND_ICON: Record<PrintableDoc["kind"], LucideIcon> = {
  Checklist: ClipboardCheck,
  Worksheet: NotebookPen,
  "Study plan": CalendarRange,
  "Revision notes": ScrollText,
};

const downloadClass =
  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-button bg-brand-accent px-4 text-[13px] font-medium text-white no-underline hover:bg-brand-accent-2 focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:outline-none";

// Quick Link → Downloadable PDFs. Every button downloads a real PDF generated
// from EliteCadet's own content (app/student/resources/downloads/[slug]).
export default async function DownloadsPage() {
  const printables = getPrintables();
  const articles = (await getResources()).data ?? [];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <Link href="/student/resources" className="inline-flex min-h-11 w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Resources
      </Link>
      <PageHeader title="Downloadable PDFs" subtitle="Print-ready checklists, worksheets with answer space, a study plan and a PDF of every study guide in the library." />

      <section aria-labelledby="printables-title" className="flex flex-col gap-3">
        <h2 id="printables-title" className="text-[19px] font-semibold text-ink">
          Worksheets &amp; checklists
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {printables.map((d) => {
            const Icon = KIND_ICON[d.kind];
            return (
              <li key={d.slug} className="glass-regular flex flex-col gap-3 rounded-card p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                    <Icon aria-hidden="true" size={20} />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
                      {d.kind} · PDF · {d.blocks.length} {d.blocks.length === 1 ? "section" : "sections"}
                    </p>
                    <h3 className="text-[16px] leading-snug font-semibold text-ink">{d.title}</h3>
                    <p className="text-[13px] text-ink-secondary">{d.description}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <CategoryTag category={d.category} />
                  <a href={`/student/resources/downloads/${d.slug}`} download className={downloadClass}>
                    <FileDown aria-hidden="true" size={16} />
                    Download<span className="sr-only"> {d.title} (PDF)</span>
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="guides-title" className="flex flex-col gap-3">
        <div>
          <h2 id="guides-title" className="text-[19px] font-semibold text-ink">
            Study guides
          </h2>
          <p className="text-[13px] text-ink-secondary">Each library article as a PDF, with its exercises and takeaways.</p>
        </div>
        {RESOURCE_CATEGORIES.map((c) => {
          const inCategory = articles.filter((a) => a.category === c);
          if (inCategory.length === 0) return null;
          return (
            <div key={c} className="glass-regular overflow-hidden rounded-card">
              <h3 className="border-b border-hairline px-5 py-3 text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{c}</h3>
              <ul className="divide-y divide-hairline">
                {inCategory.map((a) => (
                  <li key={a.slug} className="row-hover-tint flex flex-wrap items-center gap-3 px-5 py-2">
                    <FileText aria-hidden="true" size={18} className="shrink-0 text-ink-secondary" />
                    <Link href={`/student/resources/${a.slug}`} className="min-w-0 flex-1 text-[14px] font-medium text-ink no-underline hover:text-brand-accent">
                      {a.title}
                    </Link>
                    <span className="text-[12px] text-ink-secondary">{a.readingMinutes} min read</span>
                    <a
                      href={`/student/resources/downloads/${a.slug}`}
                      download
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-button px-3 text-[13px] font-medium text-brand-accent no-underline hover:bg-brand-accent/10"
                    >
                      <FileDown aria-hidden="true" size={16} />
                      PDF<span className="sr-only"> of {a.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}
