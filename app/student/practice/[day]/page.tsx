import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { navIcons } from "@/components/ui/nav-icons";
import { ModuleProgressBadge } from "@/components/practice/module-progress-badge";
import { getDayModules, getDays } from "@/lib/api/ssb-journey";
import type { SsbDayId } from "@/types/ssb-journey";

export async function generateStaticParams() {
  const result = await getDays();
  return (result.data ?? []).map((day) => ({ day: day.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ day: string }>;
}): Promise<Metadata> {
  const { day } = await params;
  const daysResult = await getDays();
  const dayMeta = daysResult.data?.find((d) => d.id === day);
  return { title: dayMeta ? `Day ${dayMeta.dayNumber}` : "Practice" };
}

export default async function SsbDayPage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const daysResult = await getDays();
  const dayMeta = daysResult.data?.find((d) => d.id === day);
  if (!dayMeta) notFound();

  const modulesResult = await getDayModules(day as SsbDayId);
  if (!modulesResult.ok || !modulesResult.data) notFound();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href="/student/practice" className="text-xs text-brand-accent hover:underline">
          ← Practice
        </Link>
        <h1 className="mt-1 text-[28px] font-bold text-ink">Day {dayMeta.dayNumber}</h1>
        <p className="text-[14px] text-ink-secondary">{dayMeta.description}</p>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-secondary">{dayMeta.longDescription}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {modulesResult.data.map((module) => {
          const Icon = navIcons[module.icon];
          const href = module.href ?? `/student/practice/${day}/${module.id}`;
          return (
            <Link
              key={module.id}
              href={href}
              className="glass-hover-lift glass-regular flex flex-col gap-3 rounded-card px-5 py-5 no-underline"
            >
              <span className="glass-thin flex size-10 shrink-0 items-center justify-center rounded-full text-brand-accent">
                <Icon aria-hidden="true" size={18} />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-[15px] font-semibold text-ink">{module.title}</span>
                <span className="text-[13px] text-ink-secondary">{module.description}</span>
              </div>
              {module.bank && (module.bank.itemIds?.length ?? 0) > 0 && (
                <ModuleProgressBadge
                  dayId={day}
                  moduleId={module.id}
                  itemIds={module.bank.itemIds ?? []}
                  mode={module.bank.mode}
                />
              )}
              {module.durationLabel && (
                <span className="text-xs whitespace-nowrap text-ink-secondary">{module.durationLabel}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
