import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Get Started" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="glass-surface flex flex-col items-center gap-3 px-8 py-10">
        <h1 className="text-xl font-semibold text-text-primary">Sign-up is coming soon</h1>
        <p className="text-sm text-text-muted">
          Account creation isn&apos;t available yet — we&apos;re finishing the authentication system.
          Check back shortly.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
