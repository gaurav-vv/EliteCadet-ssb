import type { Metadata } from "next";
import { MentorProfileForm } from "@/components/mentor/profile-form";
import { DemoDataControls } from "@/components/shared/demo-data-controls";
import { loadDemoDataAction, clearDemoDataAction } from "@/lib/actions/mentor";
import { getCurrentUserAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profile" };

export default async function MentorProfilePage() {
  const { profile } = await getCurrentUserAndProfile();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Profile</h1>
        <p className="text-sm text-ink-secondary">Update how you appear to your mentees.</p>
      </div>
      <MentorProfileForm realFullName={profile?.fullName ?? ""} />
      <DemoDataControls
        loadAction={loadDemoDataAction}
        clearAction={clearDemoDataAction}
        description="Resets the sample mentees, evaluations and sessions used to preview your dashboard."
      />
    </div>
  );
}
