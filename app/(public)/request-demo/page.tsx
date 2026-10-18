import type { Metadata } from "next";
import { DemoRequestForm } from "@/components/public/demo-request-form";
import { isDemoInterest } from "@/lib/server/demo-requests/validation";

export const metadata: Metadata = { title: "Request a Demo" };

export default async function RequestDemoPage({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  const { interest } = await searchParams;
  return (
    <div className="bg-[var(--site-bg-soft)]">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-2">
          <p className="site-eyebrow">Request a Demo</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--site-navy)]">See how EliteCadet can help</h1>
          <p className="text-[0.9375rem] leading-relaxed text-[var(--site-muted)]">
            Tell us a little about yourself and we&apos;ll get in touch to walk you through the platform.
          </p>
        </div>
        <DemoRequestForm initialInterest={isDemoInterest(interest) ? interest : "student"} />
      </div>
    </div>
  );
}
