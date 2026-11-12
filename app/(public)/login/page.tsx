import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { FlashToast } from "@/components/shared/flash-toast";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-6 px-6 py-20">
      <LoginForm redirectTo={next} reason={reason} />
      <FlashToast />
    </div>
  );
}
