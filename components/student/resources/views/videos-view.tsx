import Link from "next/link";
import { BookOpen, ChevronLeft, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryTag } from "@/components/student/resources/resource-ui";
import { VideoPlayer } from "@/components/student/resources/video-player";
import {
  CATEGORY_SLUGS,
  categoryFromSlug,
  getVideos,
  VIDEOS_VERIFIED_ON,
} from "@/lib/api/resources";
import { formatDay } from "@/lib/utils/format-date";
import { RESOURCE_CATEGORIES } from "@/types/resources";
import { resourcesBase, type ResourceAudience } from "@/lib/resources/paths";

const chipClass =
  "filter-chip glass-thin inline-flex min-h-11 shrink-0 items-center rounded-pill px-4 text-[13px] font-medium whitespace-nowrap text-ink-secondary no-underline";

// Quick Link → SSB Preparation Videos: a curated, topic-filtered list that
// plays inside EliteCadet, each paired with the library article to read next.
export async function VideosView({
  audience = "student",
  searchParams,
}: {
  audience?: ResourceAudience;
  searchParams: Promise<{ category?: string }>;
}) {
  const home = resourcesBase(audience);
  const category = categoryFromSlug((await searchParams).category);
  const all = getVideos();
  const videos = getVideos(category);
  const topics = RESOURCE_CATEGORIES.filter((c) =>
    all.some((v) => v.category === c),
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link
        href={home}
        className="inline-flex min-h-11 w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        Resources
      </Link>
      <PageHeader
        title="SSB Preparation Videos"
        subtitle="Short explainers on the SSB procedure, psychology tests, GTO tasks, the interview and the NDA exam — each paired with a guide to read next."
      />

      <nav
        aria-label="Video topics"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        <Link
          href={`${home}/videos`}
          data-active={!category}
          aria-current={!category ? "page" : undefined}
          className={chipClass}
        >
          All ({all.length})
        </Link>
        {topics.map((c) => (
          <Link
            key={c}
            href={`${home}/videos?category=${CATEGORY_SLUGS[c]}`}
            data-active={category === c}
            aria-current={category === c ? "page" : undefined}
            className={chipClass}
          >
            {c} ({all.filter((v) => v.category === c).length})
          </Link>
        ))}
      </nav>

      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {videos.map((v) => (
          <li
            key={v.youtubeId}
            className="glass-regular flex flex-col overflow-hidden rounded-card"
          >
            <VideoPlayer youtubeId={v.youtubeId} title={v.title} />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <CategoryTag category={v.category} />
                <span className="inline-flex items-center gap-1 text-[12px] text-ink-secondary">
                  <Clock aria-hidden="true" size={13} />
                  {v.duration}
                </span>
              </div>
              <h2 className="text-[15px] leading-snug font-semibold text-ink">
                {v.title}
              </h2>
              <p className="text-[12px] text-ink-secondary">
                {v.channel} · YouTube
              </p>
              <p className="text-[13px] text-ink-secondary">{v.note}</p>
              {v.relatedSlug && (
                <Link
                  href={`${home}/${v.relatedSlug}`}
                  className="mt-auto inline-flex min-h-11 w-fit items-center gap-1.5 text-[13px] font-medium text-brand-accent no-underline hover:underline"
                >
                  <BookOpen aria-hidden="true" size={15} />
                  Read the related guide
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="text-[12px] text-ink-secondary">
        Videos are by independent creators on YouTube and are checked to be
        available as of {formatDay(VIDEOS_VERIFIED_ON)}. They are a starting
        point, not official guidance — no video can guarantee an SSB outcome.
        Confirm exam details in official notifications.
      </p>
    </div>
  );
}
