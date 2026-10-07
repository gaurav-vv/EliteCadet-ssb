import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { SettingsForm } from "@/components/academy/settings-form";
import { DemoDataControls } from "@/components/shared/demo-data-controls";
import { loadDemoDataAction, clearDemoDataAction } from "@/lib/actions/academy";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { getMyAcademy } from "@/lib/server/academies/service";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [academy, { profile }] = await Promise.all([getMyAcademy(), getCurrentUserAndProfile()]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Settings</h1>
        <p className="text-sm text-ink-secondary">Your academy&apos;s details and your admin profile.</p>
      </div>
      {!academy.ok || !academy.data ? (
        <RetryErrorState message={academy.error?.message ?? "We couldn't load your academy. Please try again."} />
      ) : (
        <SettingsForm academy={academy.data} adminName={profile?.fullName ?? ""} />
      )}
      <DemoDataControls
        loadAction={loadDemoDataAction}
        clearAction={clearDemoDataAction}
        description="Resets the sample students, batches and mentors used to preview the academy dashboard."
      />
    </div>
  );
}
