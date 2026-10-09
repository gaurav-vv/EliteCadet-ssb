"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NewsArticle } from "@/types/news";

const ROTATE_MS = 5500;

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const arrowClass =
  "flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-sm hover:bg-rose-50 disabled:opacity-40";

// Important News banner: one official/actionable update at a time, auto-advancing,
// with manual arrows. Pauses while hovered/focused so the link stays clickable.
export function NewsTicker({ articles }: { articles: NewsArticle[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = articles.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, count]);

  if (count === 0) return null;
  const current = articles[index % count];
  const step = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <section
      aria-label="Important news"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="flex items-center gap-2 rounded-card border border-rose-200 bg-rose-50 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4"
    >
      <Image
        src="/images/student-dashboard/announcement-icon.jpeg"
        alt=""
        width={491}
        height={407}
        className="hidden h-12 w-auto shrink-0 object-contain mix-blend-multiply sm:block"
      />
      <button type="button" aria-label="Previous news" onClick={() => step(-1)} disabled={count < 2} className={arrowClass}>
        <ChevronLeft aria-hidden="true" size={18} />
      </button>
      <div key={index} className="animate-in fade-in min-w-0 flex-1 duration-300 motion-reduce:animate-none">
        <p className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold tracking-[0.04em] uppercase">
          <span className="text-rose-600">Important News</span>
          <span className="text-ink-secondary normal-case">
            {current.category} · {current.source}
            {current.date ? ` · ${formatDate(current.date)}` : ""}
          </span>
        </p>
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          title={current.title}
          className="block truncate text-[14px] font-semibold text-ink no-underline hover:underline sm:text-[15px]"
        >
          {current.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <button type="button" aria-label="Next news" onClick={() => step(1)} disabled={count < 2} className={arrowClass}>
        <ChevronRight aria-hidden="true" size={18} />
      </button>
      <span className="shrink-0 text-[13px] text-ink-secondary tabular-nums">
        {index + 1} / {count}
      </span>
    </section>
  );
}
