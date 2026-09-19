import type { Metadata } from "next";
import { OnboardingForm } from "@/components/student/onboarding-form";
import { getCurrentUserAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const { profile } = await getCurrentUserAndProfile();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <OnboardingForm defaultFullName={profile?.fullName ?? ""} />
    </div>
  );
}
