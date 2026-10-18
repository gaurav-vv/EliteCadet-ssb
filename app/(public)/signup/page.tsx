import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Get Started" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-6 px-6 py-20">
      <SignupForm initialRole={as === "academy" ? "academy_admin" : "student"} />
    </div>
  );
}
