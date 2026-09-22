import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Day2CategoryHero } from "@/components/student/day2/day2-category-hero";
import { Day2FullDayBanner } from "@/components/student/day2/day2-fullday-banner";
import { Day2SectionPicker } from "@/components/student/day2/day2-section-picker";
import { Day2ResourceList } from "@/components/student/day2/day2-resource-list";
import { getDay2ResourceLibrary } from "@/lib/api/day2-resources";
import { DAY2_CATEGORY_META, DAY2_CATEGORY_SLUGS, DAY2_SLUG_TO_CATEGORY } from "@/lib/day2/categories";
import { DAY2_SECTIONS, getAvailableSections } from "@/lib/day2/sections";

export function generateStaticParams() {
  return Object.keys(DAY2_SLUG_TO_CATEGORY).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = DAY2_SLUG_TO_CATEGORY[slug];
  return { title: category ? `${DAY2_CATEGORY_META[category].shortLabel} Resources` : "Day 2 Resources" };
}

// Dedicated per-test page — progressive disclosure (redesign brief §9–§12):
// hero → "what do you want to do?" → only then the resources for that one
// section. Never dumps the full category list. Invalid slugs 404.
export default async function Day2CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ do?: string }>;
}) {
  const { category: slug } = await params;
  const category = DAY2_SLUG_TO_CATEGORY[slug];

  if (!category) {
    notFound();
  }

  const { do: doParam } = await searchParams;

  const result = await getDay2ResourceLibrary();
  const resources = (result.data ?? []).filter((r) => r.category === category);
  const meta = DAY2_CATEGORY_META[category];
  const basePath = `/student/resources/day-2/${DAY2_CATEGORY_SLUGS[category]}`;

  const availableSections = getAvailableSections(resources);
  const selectedSection = availableSections.find((s) => s.key === doParam);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <Day2CategoryHero category={category} />

      {resources.length === 0 ? (
        <EmptyState title="No resources yet" description={`Resources for ${meta.shortLabel} will appear here.`} />
      ) : (
        <>
          {category === "full-day-2" && !selectedSection && (
            <Day2FullDayBanner
              practiceHref={
                DAY2_SECTIONS.find((s) => s.key === "practice") && availableSections.some((s) => s.key === "practice")
                  ? `${basePath}?do=practice`
                  : basePath
              }
            />
          )}

          {selectedSection ? (
            <Day2ResourceList
              category={category}
              sectionKey={selectedSection.key}
              resources={resources.filter(selectedSection.match)}
              backHref={basePath}
            />
          ) : (
            <Day2SectionPicker category={category} resources={resources} basePath={basePath} />
          )}
        </>
      )}
    </div>
  );
}
