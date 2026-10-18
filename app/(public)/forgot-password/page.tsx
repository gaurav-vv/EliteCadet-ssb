import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-6 px-6 py-20">
      <ForgotPasswordForm reason={reason} />
    </div>
  );
}
