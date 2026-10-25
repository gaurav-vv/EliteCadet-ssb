import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FileDown, Lightbulb, PenLine, Target } from "lucide-react";
import { ResourceReadToggle } from "@/components/student/resource-read-toggle";
import { PhotoCredit, ResourcePhotoImage } from "@/components/student/resources/resource-photo";
import { CategoryTag, ResourceListCard, ResourceMeta } from "@/components/student/resources/resource-ui";
import { CATEGORY_SLUGS, getAdjacentResources, getRelatedResources, getResource } from "@/lib/api/resources";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getResource(slug);
  return { title: result.data?.title ?? "Resource", description: result.data?.description };
}

const cardTitle = "flex items-center gap-2 text-[17px] font-semibold text-ink";

export default async function ResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getResource(slug);
  if (!result.ok || !result.data) notFound();

  const r = result.data;
  const categoryHref = `/student/resources/category/${CATEGORY_SLUGS[r.category]}`;
  const related = getRelatedResources(r.slug, 4);
  const { previous, next } = getAdjacentResources(r.slug);
  const showToc = r.sections.length >= 3;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-secondary">
          <li>
            <Link href="/student/resources" className="text-ink-secondary no-underline hover:text-ink">
              Resources
            </Link>
          </li>

          <li className="flex items-center gap-1 before:content-['›']">
            <Link href={categoryHref} className="text-ink-secondary no-underline hover:text-ink">
              {r.category}
            </Link>
          </li>

          <li aria-current="page" className="flex min-w-0 items-center gap-1 before:content-['›'] max-w-[60ch] truncate text-ink">
            {r.title}
          </li>
        </ol>
      </nav>

      <header className="glass-regular grid overflow-hidden rounded-card md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
          <CategoryTag category={r.category} />
          <h1 className="text-[28px] leading-tight font-bold text-ink sm:text-[32px]">{r.title}</h1>
          <p className="text-[15px] text-ink-secondary">{r.description}</p>
          <ResourceMeta resource={r} />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href={`/student/resources/downloads/${r.slug}`}
              download
              className="glass-regular inline-flex min-h-11 items-center gap-2 rounded-button px-4 text-[13px] font-medium text-ink no-underline"
            >
              <FileDown aria-hidden="true" size={16} />
              Download as PDF
            </a>
          </div>
        </div>
        <figure className="relative m-0 min-h-48 md:min-h-full">
          <ResourcePhotoImage photo={r.photo} sizes="(min-width: 768px) 45vw, 100vw" describe priority />
          <figcaption className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/60 to-transparent px-3 pt-6 pb-2 [&_a]:text-white/90 [&_span]:text-white/90">
            <PhotoCredit photo={r.photo} />
          </figcaption>
        </figure>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article aria-labelledby="article-body-title" className="flex min-w-0 flex-col gap-6">
          <h2 id="article-body-title" className="sr-only">
            Article
          </h2>

          <section aria-labelledby="objectives-title" className="glass-regular flex flex-col gap-3 rounded-card p-6">
            <h3 id="objectives-title" className={cardTitle}>
              <Target aria-hidden="true" size={18} className="text-brand-accent" />
              What you will learn
            </h3>
            <ul className="flex flex-col gap-2">
              {r.objectives.map((o) => (
                <li key={o} className="flex gap-2 text-[14px] text-ink">
                  <CheckCircle2 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-brand-accent" />
                  {o}
                </li>
              ))}
            </ul>
          </section>

          {showToc && (
            <nav aria-label="On this page" className="glass-regular rounded-card p-5 xl:hidden">
              <p className="mb-2 text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">On this page</p>
              <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[14px]">
                {r.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-ink no-underline hover:text-brand-accent">
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="glass-regular flex flex-col gap-8 rounded-card p-6 sm:p-8">
            {r.sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="flex scroll-mt-24 flex-col gap-3">
                <h3 id={`${s.id}-h`} className="text-[20px] leading-snug font-semibold text-ink">
                  {s.heading}
                </h3>
                {s.paragraphs.map((p, i) => (
                  <p key={i} className="text-[15px] leading-relaxed text-ink">
                    {p}
                  </p>
                ))}
                {s.bullets && s.bullets.length > 0 && (
                  <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-relaxed text-ink marker:text-ink-secondary">
                    {s.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                {s.example && (
                  <figure className="rounded-xl border border-hairline bg-(--surface-base) p-4">
                    <figcaption className="mb-1.5 text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{s.example.label}</figcaption>
                    <p className="text-[14px] leading-relaxed whitespace-pre-line text-ink">{s.example.text}</p>
                  </figure>
                )}
              </section>
            ))}
          </div>

          {r.exercises.length > 0 && (
            <section aria-labelledby="exercises-title" className="glass-regular flex flex-col gap-4 rounded-card p-6">
              <h3 id="exercises-title" className={cardTitle}>
                <PenLine aria-hidden="true" size={18} className="text-brand-accent" />
                Practice exercises
              </h3>
              <ol className="flex flex-col gap-4">
                {r.exercises.map((e, i) => (
                  <li key={e.title} className="flex gap-3">
                    <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-[13px] font-semibold text-brand-accent">
                      {i + 1}
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-[15px] font-semibold text-ink">{e.title}</span>
                      <span className="text-[14px] leading-relaxed text-ink-secondary">{e.instructions}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="takeaways-title" className="glass-regular flex flex-col gap-3 rounded-card p-6">
            <h3 id="takeaways-title" className={cardTitle}>
              <Lightbulb aria-hidden="true" size={18} className="text-brand-accent" />
              Key takeaways
            </h3>
            <ul className="flex flex-col gap-2">
              {r.takeaways.map((t) => (
                <li key={t} className="flex gap-2 text-[14px] text-ink">
                  <CheckCircle2 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-brand-accent" />
                  {t}
                </li>
              ))}
            </ul>
          </section>

          {r.officialLinks && r.officialLinks.length > 0 && (
            <section aria-labelledby="official-title" className="glass-regular flex flex-col gap-2 rounded-card p-6">
              <h3 id="official-title" className={cardTitle}>
                Official sources
              </h3>
              <p className="text-[13px] text-ink-secondary">Dates, eligibility and syllabus change — always confirm in the current official notification.</p>
              <ul className="flex flex-col">
                {r.officialLinks.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-[14px] text-brand-accent">
                      {l.label}
                      <ExternalLink aria-hidden="true" size={14} />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ResourceReadToggle slug={r.slug} />

          <nav aria-label="Previous and next resources" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {previous ? (
              <Link href={`/student/resources/${previous.slug}`} className="glass-regular glass-hover-lift flex min-h-11 flex-col gap-1 rounded-card p-4 no-underline">
                <span className="inline-flex items-center gap-1 text-[12px] text-ink-secondary">
                  <ArrowLeft aria-hidden="true" size={14} />
                  Previous
                </span>
                <span className="text-[14px] font-semibold text-ink">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/student/resources/${next.slug}`} className="glass-regular glass-hover-lift flex min-h-11 flex-col items-end gap-1 rounded-card p-4 text-right no-underline">
                <span className="inline-flex items-center gap-1 text-[12px] text-ink-secondary">
                  Next
                  <ArrowRight aria-hidden="true" size={14} />
                </span>
                <span className="text-[14px] font-semibold text-ink">{next.title}</span>
              </Link>
            )}
          </nav>
        </article>

        {showToc && (
          <aside className="hidden xl:block">
            <nav aria-label="On this page (sidebar)" className="glass-regular sticky top-24 flex flex-col gap-2 rounded-card p-5">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">On this page</p>
              <ol className="flex flex-col gap-1">
                {r.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="block rounded-lg px-2 py-1.5 text-[13px] text-ink no-underline hover:bg-black/[0.04] hover:text-brand-accent">
                      {s.heading}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#exercises-title" className="block rounded-lg px-2 py-1.5 text-[13px] text-ink no-underline hover:bg-black/[0.04] hover:text-brand-accent">
                    Practice exercises
                  </a>
                </li>
              </ol>
            </nav>
          </aside>
        )}
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="related-title" className="text-[19px] font-semibold text-ink">
              Related resources
            </h2>
            <Link href={categoryHref} className="inline-flex min-h-11 items-center gap-1 text-[13px] font-medium text-brand-accent no-underline hover:underline">
              More in {r.category}
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {related.map((rel) => (
              <li key={rel.slug}>
                <ResourceListCard resource={rel} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
