import type { Metadata } from "next";
import Link from "next/link";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { DiagnosticComparison } from "@/components/diagnostic/diagnostic-comparison";
import { DiagnosticRunner } from "@/components/diagnostic/diagnostic-runner";
import { getDiagnosticForm, getMyDiagnosticOverview } from "@/lib/server/diagnostic/service";
import { formatIstDay } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "Diagnostic" };

export default async function DiagnosticPage() {
  const now = new Date().toISOString();
  const [overview, form] = await Promise.all([getMyDiagnosticOverview(now), getDiagnosticForm()]);
  if (!overview.ok || !overview.data) return <RetryErrorState message={overview.error?.message ?? "We couldn't load the diagnostic. Please try again."} />;
  const { baseline, latest, nextAllowedAt } = overview.data;
  const latestId = latest?.id ?? baseline?.id;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <div>
        {!baseline && <p className="text-[12px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Step 2 of 2</p>}
        <h1 className="text-[28px] font-bold text-ink">{baseline ? "Diagnostic" : "Your starting point"}</h1>
        <p className="max-w-2xl text-[14px] text-ink-secondary">
          {baseline
            ? "Retake it to see how far you've come. Your first attempt stays as your starting point."
            : "12 short questions, about 15 minutes, no timer. Skip anything you're unsure of — this sets where your plan begins and isn't a test you can fail."}
        </p>
      </div>
      <DiagnosticComparison overview={overview.data} />
      {latestId && (
        <Link href={`/student/diagnostic/${latestId}`} className="text-[13px] text-brand-accent hover:underline">
          See your latest answers and feedback
        </Link>
      )}
      {nextAllowedAt ? (
        <p className="glass-regular rounded-card px-5 py-4 text-sm text-ink">You can retake the diagnostic from {formatIstDay(nextAllowedAt)}.</p>
      ) : !form.ok || !form.data ? (
        <RetryErrorState message={form.error?.message ?? "We couldn't load the questions. Please try again."} />
      ) : (
        <DiagnosticRunner items={form.data} />
      )}
    </div>
  );
}
