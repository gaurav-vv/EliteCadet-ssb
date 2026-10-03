"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 300;

interface UseUrlFiltersOptions<P extends { q: string; page: number }> {
  // The params the server rendered with (the URL is the source of truth).
  params: P;
  // Typed params → "" or "?a=b" (e.g. buildBatchListQuery).
  buildQuery: (params: Partial<P>) => string;
}

// Drives a server-filtered list from the URL: controls call `update`, which
// rewrites the query string; Next re-renders the server component with the
// new results. Search is debounced and the page resets to 1 on any change.
export function useUrlFilters<P extends { q: string; page: number }>({ params, buildQuery }: UseUrlFiltersOptions<P>) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(params);

  // Adopt the URL's search text when it changes externally (Back/Forward,
  // Clear filters) without overwriting what the user is currently typing.
  const [syncedQ, setSyncedQ] = useState(params.q);
  if (params.q !== syncedQ) {
    setSyncedQ(params.q);
    if (query.trim() !== params.q) setQuery(params.q);
  }

  useEffect(() => {
    latest.current = params;
  }, [params]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function update(patch: Partial<P>) {
    startTransition(() => {
      router.replace(`${pathname}${buildQuery({ ...latest.current, ...patch, page: 1 })}`, { scroll: false });
    });
  }

  function onSearch(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ q: value.trim() } as Partial<P>), SEARCH_DEBOUNCE_MS);
  }

  function clearAll() {
    if (timer.current) clearTimeout(timer.current);
    setQuery("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  return { query, onSearch, update, clearAll, isPending };
}
