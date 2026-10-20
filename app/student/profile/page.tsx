import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { PreferencesForm } from "@/components/student/preferences-form";
import { ResetLocalData } from "@/components/student/reset-local-data";
import { getMyPreferences } from "@/lib/server/student/preferences";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const prefs = await getMyPreferences();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Profile</h1>
        <p className="text-sm text-ink-secondary">Your preparation details. Your roadmap updates when you change them.</p>
      </div>
      <section className="glass-regular rounded-card p-6">
        {!prefs.ok || !prefs.data ? <RetryErrorState message={prefs.error?.message ?? "We couldn't load your details. Please try again."} /> : <PreferencesForm initial={prefs.data} mode="profile" />}
      </section>
      <ResetLocalData />
    </div>
  );
}
