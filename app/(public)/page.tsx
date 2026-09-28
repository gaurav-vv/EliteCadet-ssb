import Link from "next/link";
import { GraduationCap, Users, Building2, ClipboardList, Sparkles, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isDevPreviewEnabled } from "@/lib/auth/dev-preview";

const roles = [
  {
    icon: GraduationCap,
    title: "For Students",
    description:
      "Practise Psychology tests and interview scenarios, get AI-assisted feedback on every response, and see exactly what to work on next.",
    previewHref: "/dev-preview/student",
  },
  {
    icon: Users,
    title: "For Mentors",
    description:
      "Review your mentees' activity and AI feedback, evaluate their performance, and follow up with the students who need attention.",
    previewHref: "/dev-preview/mentor",
  },
  {
    icon: Building2,
    title: "For Academies",
    description:
      "Manage students, batches and mentors from one place, and see readiness across your academy so nothing falls through the cracks.",
    previewHref: "/dev-preview/academy_admin",
  },
];

const loop = [
  {
    icon: ClipboardList,
    title: "Practice",
    description: "Work through Psychology and Interview activities built around the real SSB format.",
  },
  {
    icon: Sparkles,
    title: "AI Feedback",
    description: "Get structured, response-specific feedback — observation, evidence, impact and a concrete next step.",
  },
  {
    icon: LineChart,
    title: "Improve",
    description: "Track readiness and weak areas over time, then practise again with clear direction.",
  },
];

export default function LandingPage() {
  const showDevPreview = isDevPreviewEnabled();

  return (
    <>
      <section className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Prepare for the SSB with structured practice and AI feedback
          </h1>
          <p className="max-w-2xl text-lg text-ink-secondary">
            SSB Academy gives students a clear practice loop, mentors the tools to guide and evaluate,
            and academies visibility into readiness — all in one place.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-glow-accent">
              <Link href="/signup">Start Preparing</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup">Request a Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-ink">
          Built for every role in your preparation journey
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {roles.map(({ icon: Icon, title, description, previewHref }) => (
            <div key={title} className="glass-regular flex flex-col gap-3 p-6 text-left">
              <Icon aria-hidden="true" size={24} className="text-brand-accent" />
              <h3 className="font-semibold text-ink">{title}</h3>
              <p className="text-sm text-ink-secondary">{description}</p>
              {showDevPreview && (
                <Link href={previewHref} className="text-xs text-brand-accent hover:underline">
                  Preview (no login yet) →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-ink">
            The core loop
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {loop.map(({ icon: Icon, title, description }, i) => (
              <div key={title} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand-accent text-sm font-medium text-brand-accent-fg">
                    {i + 1}
                  </span>
                  <Icon aria-hidden="true" size={20} className="text-brand-accent" />
                </div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="text-sm text-ink-secondary">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">
          Ready to start preparing?
        </h2>
        <p className="max-w-xl text-ink-secondary">
          Create an account to begin practising, or request a demo if you run an academy.
        </p>
        <Button asChild size="lg" className="shadow-glow-accent">
          <Link href="/signup">Get Started</Link>
        </Button>
      </section>
    </>
  );
}
