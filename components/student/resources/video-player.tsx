"use client";

import Image from "next/image";
import { useState } from "react";
import { Play } from "lucide-react";

// Click-to-play YouTube embed: shows YouTube's thumbnail until the student
// chooses to play, so the list doesn't load 17 players (or YouTube cookies)
// up front. Plays from youtube-nocookie.com inside EliteCadet.
export function VideoPlayer({ youtubeId, title }: { youtubeId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="aspect-video w-full rounded-t-[inherit] border-0 bg-black"
      />
    );
  }

  return (
    <button type="button" onClick={() => setPlaying(true)} className="group relative block aspect-video w-full overflow-hidden rounded-t-[inherit] bg-(--academy-navy)">
      <Image
        src={`https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`}
        alt=""
        fill
        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
        className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-black/70 text-white transition-transform group-hover:scale-105 motion-reduce:transform-none">
          <Play aria-hidden="true" size={24} className="translate-x-0.5" fill="currentColor" />
        </span>
      </span>
      <span className="sr-only">Play video: {title}</span>
    </button>
  );
}
