import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BankPracticeRunner } from "@/components/practice/bank-practice-runner";
import { SsbBankTestSession } from "@/components/practice/ssb-bank-test-session";
import { SelfAssessmentChecklist } from "@/components/student/self-assessment-checklist";
import { JourneyFinalSummary } from "@/components/practice/journey-final-summary";
import { getDayModules, getDays, getSsbModuleDetail } from "@/lib/api/ssb-journey";
import { getAllModules } from "@/lib/mock/ssb-journey";
import type { SsbDayId } from "@/types/ssb-journey";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ day: string; module: string }>;
}): Promise<Metadata> {
  const { day, module: moduleId } = await params;
  const result = await getSsbModuleDetail(day as SsbDayId, moduleId);
  return { title: result.data?.title ?? "Practice" };
}

export default async function SsbModulePage({
  params,
}: {
  params: Promise<{ day: string; module: string }>;
}) {
  const { day, module: moduleId } = await params;
  const dayId = day as SsbDayId;

  const [daysResult, modulesResult, detailResult] = await Promise.all([
    getDays(),
    getDayModules(dayId),
    getSsbModuleDetail(dayId, moduleId),
  ]);

  const dayMeta = daysResult.data?.find((d) => d.id === dayId);
  if (!dayMeta || !modulesResult.ok || !detailResult.ok || !detailResult.data) notFound();

  const mod = detailResult.data;
  // Modules with an `href` (e.g. Day 2's Test cards, Day 4's Personal
  // Interview) are only ever linked to directly from the day page — this
  // route still resolves for them so a bookmarked/typed URL redirects to the
  // real page instead of rendering an empty test with no content.
  if (mod.href) redirect(mod.href);

  const backHref = `/student/practice/${dayId}`;
  const backLabel = `Day ${dayMeta.dayNumber}`;

  if (mod.kind === "reading" && mod.reading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
        <Link href={backHref} className="text-xs text-brand-accent hover:underline">
          ← {backLabel}
        </Link>
        <h1 className="text-[28px] font-bold text-ink">{mod.title}</h1>
        <div className="glass-regular px-6 py-6 text-sm leading-relaxed text-ink">{mod.reading.body}</div>
        {mod.reading.articles?.map((article) => (
          <div key={article.title} className="glass-regular flex flex-col gap-2 px-6 py-5">
            <h2 className="text-[16px] font-semibold text-ink">{article.title}</h2>
            <p className="text-sm leading-relaxed text-ink-secondary">{article.body}</p>
          </div>
        ))}
      </div>
    );
  }

  if (mod.kind === "info" && mod.info) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
        <Link href={backHref} className="text-xs text-brand-accent hover:underline">
          ← {backLabel}
        </Link>
        <h1 className="text-[28px] font-bold text-ink">{mod.title}</h1>
        <div className="glass-regular px-6 py-6 text-sm leading-relaxed text-ink">{mod.info.overview}</div>
        <div className="glass-regular flex flex-col gap-2 px-6 py-5">
          <h2 className="text-[16px] font-semibold text-ink">What assessors look for</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink-secondary">
            {mod.info.tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (mod.kind === "bank" && mod.bank?.mode === "practice") {
    return (
      <BankPracticeRunner
        dayId={dayId}
        moduleId={mod.id}
        backHref={backHref}
        backLabel={backLabel}
        mcqItems={mod.mcqItems}
        responseItems={mod.responseItems}
      />
    );
  }

  if (mod.kind === "bank" && mod.bank?.mode === "test") {
    return (
      <SsbBankTestSession
        title={mod.title}
        description={mod.description}
        backHref={backHref}
        backLabel={backLabel}
        itemKind={mod.bank.itemKind}
        mcqItems={mod.mcqItems}
        responseItems={mod.responseItems}
        carouselTiming={mod.carouselTiming}
      />
    );
  }

  if (mod.kind === "checklist") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
        <Link href={backHref} className="text-xs text-brand-accent hover:underline">
          ← {backLabel}
        </Link>
        <div>
          <h1 className="text-[28px] font-bold text-ink">{mod.title}</h1>
          <p className="text-[14px] text-ink-secondary">{mod.description}</p>
        </div>
        <SelfAssessmentChecklist />
      </div>
    );
  }

  if (mod.kind === "summary") {
    const allModules = getAllModules().filter((m) => m.kind === "bank" && m.bank?.mode === "practice");
    const daysWithModules = (daysResult.data ?? []).map((d) => ({
      dayId: d.id,
      dayNumber: d.dayNumber,
      title: d.title,
      modules: allModules
        .filter((m) => m.dayId === d.id)
        .map((m) => ({ moduleId: m.id, itemIds: (m.mcqItems ?? m.responseItems ?? []).map((i) => i.id) })),
    }));

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
        <Link href={backHref} className="text-xs text-brand-accent hover:underline">
          ← {backLabel}
        </Link>
        <div>
          <h1 className="text-[28px] font-bold text-ink">{mod.title}</h1>
          <p className="text-[14px] text-ink-secondary">{mod.description}</p>
        </div>
        <JourneyFinalSummary days={daysWithModules} />
      </div>
    );
  }

  notFound();
}
