"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

// A Link that prefetches when the person shows intent to open it (pointer over it, keyboard focus, touch)
// instead of as soon as it is on screen. Every workspace page is rendered per request, so a viewport
// prefetch is a full server render (proxy profile read, layout reads) per visible link: measured locally,
// that was 19-37 prefetch requests and 28-61 database calls per login. Hover usually comes 100-300 ms
// before the click, so the page is still warm when it is opened.
//
// This is the pattern the Next.js docs give for hover prefetching: `prefetch={false}` until the first
// sign of intent, then the default behaviour. It needs no router, so it also renders in isolation.
export function IntentPrefetchLink({ onMouseEnter, onFocus, onTouchStart, ...props }: IntentPrefetchLinkProps) {
  const [active, setActive] = useState(false);

  return (
    <Link
      {...props}
      prefetch={active ? null : false}
      onMouseEnter={(event) => {
        setActive(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setActive(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setActive(true);
        onTouchStart?.(event);
      }}
    />
  );
}
