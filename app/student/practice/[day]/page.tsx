import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModuleProgressBadge } from "@/components/practice/module-progress-badge";
import { navIcons } from "@/components/ui/nav-icons";
import { getDay, getModulesForDay, isDayId, SSB_DAYS } from "@/lib/practice/journey";
import { getMyBankProgress } from "@/lib/server/practice/service";

export function generateStaticParams() {
  return SSB_DAYS.map((day) => ({ day: day.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ day: string }> }): Promise<Metadata> {
  const { day } = await params;
  const dayMeta = getDay(day);
  return { title: dayMeta ? `Day ${dayMeta.dayNumber}` : "Practice" };
}

export default async function SsbDayPage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const dayMeta = getDay(day);
  if (!dayMeta || !isDayId(day)) notFound();
  const modules = getModulesForDay(day);
  // Real counts from the banks (and the student's done answers); a failed
  // read just hides the badges rather than showing a wrong number.
  const progress = await getMyBankProgress(modules.flatMap((m) => (m.bank ? [m.bank.slug] : [])));

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
        {modules.map((module) => {
          const Icon = navIcons[module.icon];
          const href = module.href ?? `/student/practice/${day}/${module.id}`;
          const bankProgress = module.bank ? progress.data?.[module.bank.slug] : undefined;
          return (
            <Link key={module.id} href={href} className="glass-hover-lift glass-regular flex flex-col gap-3 rounded-card px-5 py-5 no-underline">
              <span className="glass-thin flex size-10 shrink-0 items-center justify-center rounded-full text-brand-accent">
                <Icon aria-hidden="true" size={18} />
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <span className="text-[15px] font-semibold text-ink">{module.title}</span>
                <span className="text-[13px] text-ink-secondary">{module.description}</span>
              </div>
              {module.bank && bankProgress && bankProgress.total > 0 && <ModuleProgressBadge progress={bankProgress} mode={module.bank.mode} />}
              {module.durationLabel && <span className="text-xs whitespace-nowrap text-ink-secondary">{module.durationLabel}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
