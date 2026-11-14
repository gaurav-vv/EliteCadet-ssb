import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MinimalFooter } from "@/components/layout/minimal-footer";
import { FlashToast } from "@/components/shared/flash-toast";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { PreferencesForm } from "@/components/student/preferences-form";
import { getMyPreferences } from "@/lib/server/student/preferences";

export const metadata: Metadata = { title: "Onboarding" };

// Step 1 of 2: preferences, saved to the account. Step 2 is the diagnostic.
export default async function OnboardingPage() {
  const prefs = await getMyPreferences();
  if (prefs.ok && prefs.data?.onboarded) redirect("/student");
  return (
    <>
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-16">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Step 1 of 2</p>
          <h1 className="text-[28px] font-bold text-ink">Let&apos;s set up your preparation</h1>
          <p className="text-[14px] text-ink-secondary">This shapes your roadmap. You can change it any time from your profile.</p>
        </div>
        {!prefs.ok || !prefs.data ? <RetryErrorState message={prefs.error?.message ?? "We couldn't load your details. Please try again."} /> : <PreferencesForm initial={prefs.data} mode="onboarding" next="/student/diagnostic" />}
      </div>
      <MinimalFooter />
      <FlashToast />
    </>
  );
}
