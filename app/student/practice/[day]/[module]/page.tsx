import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { BankPracticeRunner } from "@/components/practice/bank-practice-runner";
import { JourneyFinalSummary } from "@/components/practice/journey-final-summary";
import { SsbBankTestSession } from "@/components/practice/ssb-bank-test-session";
import { SelfAssessmentChecklist } from "@/components/student/self-assessment-checklist";
import { getDay, getModuleDetail, isDayId } from "@/lib/practice/journey";
import { getMyJourneyProgress } from "@/lib/server/practice/journey-progress";
import { getBank, getMyAnswers } from "@/lib/server/practice/service";
import type { GuidedPracticeItem, McqItem } from "@/types/ssb-journey";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ day: string; module: string }>;
}): Promise<Metadata> {
  const { day, module: moduleId } = await params;
  return { title: (isDayId(day) && getModuleDetail(day, moduleId)?.title) || "Practice" };
}

export default async function SsbModulePage({
  params,
}: {
  params: Promise<{ day: string; module: string }>;
}) {
  const { day, module: moduleId } = await params;
  const dayMeta = getDay(day);
  const mod = isDayId(day) ? getModuleDetail(day, moduleId) : undefined;
  if (!dayMeta || !mod) notFound();
  const dayId = dayMeta.id;
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
        {mod.info.durationLabel && <p className="text-[13px] text-ink-secondary">{mod.info.durationLabel}</p>}
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

  if (mod.kind === "bank" && mod.bank) {
    const forTest = mod.bank.mode === "test";
    const [bank, answers] = await Promise.all([getBank(mod.bank.slug, { forTest }), forTest ? null : getMyAnswers(mod.bank.slug)]);
    if (!bank.ok && bank.error?.code === "not_found") notFound();
    if (!bank.ok || !bank.data || (answers && (!answers.ok || !answers.data))) {
      return (
        <div className="flex flex-col gap-4 pb-10">
          <Link href={backHref} className="text-xs text-brand-accent hover:underline">
            ← {backLabel}
          </Link>
          <RetryErrorState message={bank.error?.message ?? answers?.error?.message ?? "We couldn't load these questions. Please try again."} />
        </div>
      );
    }
    const isMcq = bank.data.kind === "mcq";
    const mcqItems = isMcq ? (bank.data.items as McqItem[]) : undefined;
    const responseItems = isMcq ? undefined : (bank.data.items as GuidedPracticeItem[]);

    if (!forTest) {
      return (
        <BankPracticeRunner
          slug={mod.bank.slug}
          backHref={backHref}
          backLabel={backLabel}
          context={mod.context}
          mcqItems={mcqItems}
          responseItems={responseItems}
          initialAnswers={answers?.data ?? {}}
          selfReview={mod.selfReview}
        />
      );
    }
    return (
      <SsbBankTestSession
        slug={mod.bank.slug}
        title={mod.title}
        description={mod.description}
        context={mod.context}
        backHref={backHref}
        backLabel={backLabel}
        itemKind={mod.bank.itemKind}
        mcqItems={mcqItems}
        responseItems={responseItems}
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
          {mod.context && <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">{mod.context}</p>}
        </div>
        <SelfAssessmentChecklist />
      </div>
    );
  }

  if (mod.kind === "summary") {
    const progress = await getMyJourneyProgress();
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
        <Link href={backHref} className="text-xs text-brand-accent hover:underline">
          ← {backLabel}
        </Link>
        <div>
          <h1 className="text-[28px] font-bold text-ink">{mod.title}</h1>
          <p className="text-[14px] text-ink-secondary">{mod.description}</p>
          {mod.context && <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">{mod.context}</p>}
        </div>
        {progress.ok && progress.data ? (
          <JourneyFinalSummary overall={progress.data.overall} days={progress.data.days} />
        ) : (
          <RetryErrorState message={progress.error?.message ?? "We couldn't load your progress. Please try again."} />
        )}
      </div>
    );
  }

  notFound();
}
