"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "cn";
import type { NewsArticle } from "@/types/news";

// News thumbnail: the photo published with the article (PIB's image host
// only — next.config.ts remotePatterns) or, when there is none or it fails to
// load, an illustrated fallback for the story's topic (Navy, Army, Air Force,
// exams, general defence). Never an empty grey box, never a broken image, and
// a failed image only affects its own row.

export type NewsTopic = "navy" | "army" | "air" | "exam" | "defence";

export function newsTopic(a: Pick<NewsArticle, "title" | "category">): NewsTopic {
  if (a.category === "Exam Update" || /\b(UPSC|NDA|CDS|AFCAT|exam|result|admit card)\b/i.test(a.title)) return "exam";
  if (/\b(nav(y|al)|INS|ship|submarine|maritime|coast guard|fleet)\b/i.test(a.title)) return "navy";
  if (/\b(air force|IAF|air staff|aircraft|fighter|flying|air wing|helicopter)\b/i.test(a.title)) return "air";
  if (/\b(army|soldier|regiment|infantry|corps|battalion|cantonment|agniveer)\b/i.test(a.title)) return "army";
  return "defence";
}

const TOPIC_LABEL: Record<NewsTopic, string> = { navy: "Navy", army: "Army", air: "Air Force", exam: "Exams", defence: "Defence" };

const BG: Record<NewsTopic, [string, string]> = {
  navy: ["#1d3b6e", "#4f7fb8"],
  army: ["#3d4a2c", "#7b8a55"],
  air: ["#28508a", "#8fb6e3"],
  exam: ["#3b3f8f", "#7d82dc"],
  defence: ["#1a2547", "#4a5a8e"],
};

function Glyph({ topic }: { topic: NewsTopic }) {
  const fill = "rgba(255,255,255,0.92)";
  switch (topic) {
    case "navy":
      return (
        <g fill={fill}>
          <path d="M14 44 L66 44 L60 52 L20 52 Z" />
          <path d="M26 44 L26 36 L44 36 L44 30 L50 30 L50 36 L56 36 L56 44 Z" />
          <rect x="46" y="22" width="2" height="8" />
          <path d="M8 56 Q20 52 32 56 T56 56 T80 56" stroke={fill} strokeWidth="2" fill="none" opacity="0.6" />
        </g>
      );
    case "army":
      return (
        <g fill={fill}>
          <path d="M18 46 L62 46 L66 52 L14 52 Z" />
          <path d="M24 46 L28 36 L52 36 L56 46 Z" />
          <rect x="40" y="38" width="28" height="3" rx="1.5" transform="rotate(-12 40 38)" />
          <g opacity="0.7">
            <circle cx="22" cy="54" r="3" />
            <circle cx="32" cy="54" r="3" />
            <circle cx="42" cy="54" r="3" />
            <circle cx="52" cy="54" r="3" />
          </g>
        </g>
      );
    case "air":
      return (
        <g fill={fill} transform="rotate(-18 40 40)">
          <path d="M14 40 L60 37 C66 37 68 40 68 40 C68 40 66 43 60 43 L14 40 Z" />
          <path d="M34 39 L22 24 L28 24 L46 38 Z" />
          <path d="M34 41 L22 56 L28 56 L46 42 Z" />
          <path d="M16 40 L10 32 L14 32 L22 39 Z" />
        </g>
      );
    case "exam":
      return (
        <g>
          <rect x="24" y="16" width="32" height="44" rx="3" fill={fill} />
          <g stroke="#3b3f8f" strokeWidth="2.5" strokeLinecap="round">
            <path d="M30 26 L50 26 M30 34 L50 34 M30 42 L44 42" />
          </g>
          <path d="M44 52 L48 56 L56 46" stroke="#2e8b57" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case "defence":
      return (
        <g fill={fill}>
          <path d="M40 14 L60 22 L60 38 C60 50 50 58 40 62 C30 58 20 50 20 38 L20 22 Z" opacity="0.95" />
          <path d="M40 24 L43 33 L52 33 L45 39 L48 48 L40 42 L32 48 L35 39 L28 33 L37 33 Z" fill={BG.defence[0]} />
        </g>
      );
  }
}

export function NewsFallbackArt({ topic, className }: { topic: NewsTopic; className?: string }) {
  const [a, b] = BG[topic];
  return (
    <span className={cn("relative block overflow-hidden", className)} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      <svg viewBox="0 0 80 72" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" className="absolute inset-0 m-auto h-[78%] w-[78%]">
        <Glyph topic={topic} />
      </svg>
      <span className="absolute bottom-1 left-1.5 text-[9px] font-semibold tracking-[0.06em] text-white/85 uppercase">{TOPIC_LABEL[topic]}</span>
    </span>
  );
}

export function NewsThumbnail({ article, className, sizes = "96px", priority = false }: { article: NewsArticle; className?: string; sizes?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const topic = newsTopic(article);
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-lg bg-(--academy-navy)", className)}>
      {article.image && !failed ? (
        <Image src={article.image} alt="" fill sizes={sizes} priority={priority} onError={() => setFailed(true)} className="object-cover" />
      ) : (
        <NewsFallbackArt topic={topic} className="absolute inset-0" />
      )}
    </span>
  );
}
