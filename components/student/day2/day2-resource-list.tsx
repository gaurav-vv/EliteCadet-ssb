"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Day2ResourceCard } from "@/components/student/day2/day2-resource-card";
import { DAY2_CATEGORY_ACCENT } from "@/lib/day2/categories";
import { DAY2_SECTIONS, type Day2SectionKey } from "@/lib/day2/sections";
import type { Day2Resource, Day2TestCategory } from "@/types/day2-resources";

function matchesSearch(resource: Day2Resource, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = [resource.name, resource.description, ...resource.tags].join(" ").toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

interface Day2ResourceListProps {
  category: Day2TestCategory;
  /** Only the key crosses the Server → Client boundary — the section's icon/match function never do (AGENTS.md §7.12); resolved locally below. */
  sectionKey: Day2SectionKey;
  resources: Day2Resource[];
  backHref: string;
}

// Third level of the Day 2 hierarchy (redesign brief §12) — only the
// resources for the one section the student picked, nothing else. A search
// box narrows within that scope; it never reaches across sections.
export function Day2ResourceList({ category, sectionKey, resources, backHref }: Day2ResourceListProps) {
  const [search, setSearch] = useState("");
  const accent = DAY2_CATEGORY_ACCENT[category];
  const section = DAY2_SECTIONS.find((s) => s.key === sectionKey)!;

  const featured = useMemo(() => resources.find((r) => r.featured), [resources]);
  const rest = useMemo(() => resources.filter((r) => r.id !== featured?.id), [resources, featured]);
  const searched = useMemo(() => rest.filter((r) => matchesSearch(r, search)), [rest, search]);
  const showFeatured = featured && search.trim() === "";

  return (
    <section aria-labelledby="day2-section-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href={backHref}
          className="day2-cat-icon inline-flex w-fit items-center gap-1 text-[12px] font-semibold no-underline"
          style={{ "--cat-accent": accent } as React.CSSProperties}
        >
          <ChevronLeft aria-hidden="true" size={14} />
          Choose a different focus
        </Link>

        <div className="flex items-center gap-2.5">
          <span
            className="day2-cat-wash day2-cat-icon flex size-9 items-center justify-center rounded-full"
            style={{ "--cat-accent": accent } as React.CSSProperties}
          >
            <section.icon aria-hidden="true" size={17} />
          </span>
          <h2 id="day2-section-heading" className="text-[18px] font-semibold text-ink">
            {section.label}
          </h2>
        </div>

        {resources.length > 4 && (
          <label className="glass-thin flex items-center gap-2 rounded-pill px-4 py-2 sm:max-w-sm">
            <Search aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${section.label.toLowerCase()}…`}
              aria-label="Search resources"
              className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            {search && (
              <Button type="button" variant="ghost" size="icon-xs" onClick={() => setSearch("")} aria-label="Clear search">
                <X aria-hidden="true" size={13} />
              </Button>
            )}
          </label>
        )}
      </div>

      <div key={search} className="day2-rise-in flex flex-col gap-5">
        {showFeatured && (
          <div className="flex flex-col gap-2">
            <span className="day2-cat-icon text-[11px] font-semibold tracking-[0.05em] uppercase" style={{ "--cat-accent": accent } as React.CSSProperties}>
              Recommended starting point
            </span>
            <Day2ResourceCard resource={featured} highlighted />
          </div>
        )}

        {searched.length === 0 && !showFeatured ? (
          <EmptyState title="No resources match this search" description="Try a different word or clear the search." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searched.map((r) => (
              <Day2ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
