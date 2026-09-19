import type { Metadata } from "next";
import { ProfileForm } from "@/components/student/profile-form";
import { ResetLocalData } from "@/components/student/reset-local-data";
import { getCurrentUserAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { profile } = await getCurrentUserAndProfile();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Profile</h1>
        <p className="text-sm text-text-muted">Update your preparation details.</p>
      </div>
      <ProfileForm realFullName={profile?.fullName ?? ""} />
      <ResetLocalData />
    </div>
  );
}
