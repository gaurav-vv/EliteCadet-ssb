import type { Metadata } from "next";
import { SettingsForm } from "@/components/academy/settings-form";
import { DemoDataControls } from "@/components/shared/demo-data-controls";
import { getSettings } from "@/lib/api/academy";
import { loadDemoDataAction, clearDemoDataAction } from "@/lib/actions/academy";
import { getCurrentAcademyName, getCurrentUserAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [result, { profile }] = await Promise.all([getSettings(), getCurrentUserAndProfile()]);
  const realAcademyName = await getCurrentAcademyName(profile?.academyId ?? null);

  const settings = {
    ...result.data!,
    academyName: realAcademyName ?? result.data!.academyName,
    adminName: profile?.fullName || result.data!.adminName,
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted">Academy information and admin profile.</p>
      </div>
      <SettingsForm settings={settings} academyId={profile?.academyId ?? null} />
      <DemoDataControls
        loadAction={loadDemoDataAction}
        clearAction={clearDemoDataAction}
        description="Resets the sample students, batches and mentors used to preview the academy dashboard."
      />
    </div>
  );
}
