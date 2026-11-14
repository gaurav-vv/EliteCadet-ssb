"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ComponentProps } from "react";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "prefetch" | "href"> & { href: string };

// A Link that prefetches when the person shows intent to open it (pointer over it, keyboard focus, touch)
// instead of as soon as it is on screen. Every workspace page is rendered per request, so a viewport
// prefetch is a full server render (proxy profile read, layout reads) per visible link: measured locally,
// that was 19-37 prefetch requests and 28-61 database calls per login. Hover usually comes 100-300 ms
// before the click, so the page is still warm when it is opened. Prefetches once per mounted link.
export function IntentPrefetchLink({ href, onMouseEnter, onFocus, onTouchStart, ...props }: IntentPrefetchLinkProps) {
  const router = useRouter();
  const prefetched = useRef(false);

  const prefetch = () => {
    if (prefetched.current) return;
    prefetched.current = true;
    router.prefetch(href);
  };

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetch();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        prefetch();
        onTouchStart?.(event);
      }}
    />
  );
}
