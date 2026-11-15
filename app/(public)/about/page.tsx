import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChartColumn, ShieldCheck, Sparkles, UserCheck, UsersRound, type LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "EliteCadet is a platform for Services Selection Board (SSB) preparation: structured practice, mentor guidance and clear progress for students and academies.",
};

const container = "mx-auto w-full max-w-[1120px]";

const principles: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: BookOpen,
    title: "Preparation first",
    text: "Everything on the platform exists to make a candidate better prepared: practice, feedback and learning material, not vanity numbers.",
  },
  {
    icon: UserCheck,
    title: "Mentors guide, people decide",
    text: "AI-assisted feedback helps students improve between sessions. It is preparation guidance, never a prediction of an SSB result. Mentors and students make the decisions.",
  },
  {
    icon: ShieldCheck,
    title: "Academies stay separate",
    text: "Each academy's students, mentors and records are private to that academy. People only see what their role allows.",
  },
  {
    icon: ChartColumn,
    title: "Honest progress",
    text: "Dashboards show real activity and reviewed scores, so the next step is clear for a student, a mentor and an academy.",
  },
];

const audiences: { icon: LucideIcon; title: string; text: string; href: string; cta: string }[] = [
  {
    icon: Sparkles,
    title: "Students",
    text: "Practise through the SSB journey, get feedback, join live sessions and track your own readiness.",
    href: "/signup",
    cta: "Sign up as a student",
  },
  {
    icon: UsersRound,
    title: "Mentors",
    text: "Review your mentees, give feedback, run sessions and follow up, whether you work with an academy or independently.",
    href: "/request-demo?interest=mentor",
    cta: "Join as a mentor",
  },
  {
    icon: ShieldCheck,
    title: "Academies",
    text: "Bring in students and mentors, organise batches, and monitor performance and attention cases in one place.",
    href: "/signup?as=academy",
    cta: "Set up your academy",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-[var(--site-bg-soft)]">
        <div className={`${container} flex flex-col gap-4 px-4 py-14 sm:px-6 sm:py-20`}>
          <p className="site-eyebrow">About EliteCadet</p>
          <h1 className="max-w-[720px] text-3xl font-semibold tracking-tight text-[var(--site-navy)] sm:text-4xl">
            Structured SSB preparation, guided by real mentors
          </h1>
          <p className="max-w-[680px] text-base leading-relaxed text-[var(--site-muted)]">
            EliteCadet brings students, mentors and academies together on one platform for Services Selection Board
            preparation. Students practise and learn, mentors guide and evaluate, and academies see how their cadets are
            progressing.
          </p>
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="bg-[var(--site-bg)]">
        <div className={`${container} px-4 py-14 sm:px-6`}>
          <h2 id="principles-heading" className="text-2xl font-semibold tracking-tight text-[var(--site-navy)]">
            What we stand for
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {principles.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-[var(--site-radius-md)] bg-[var(--site-card)] p-6">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--site-navy)] shadow-[var(--site-shadow)]"
                >
                  <Icon className="size-5" strokeWidth={1.6} />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-[var(--site-navy)]">{title}</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-[var(--site-muted)]">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="who-heading" className="bg-[var(--site-bg-soft)]">
        <div className={`${container} px-4 py-14 sm:px-6`}>
          <h2 id="who-heading" className="text-2xl font-semibold tracking-tight text-[var(--site-navy)]">
            Who it is for
          </h2>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {audiences.map(({ icon: Icon, title, text, href, cta }) => (
              <li key={title} className="flex flex-col gap-3 rounded-[var(--site-radius-md)] bg-[var(--site-bg)] p-6">
                <Icon aria-hidden="true" className="size-6 text-[var(--site-navy)]" strokeWidth={1.6} />
                <h3 className="font-semibold text-[var(--site-navy)]">{title}</h3>
                <p className="flex-1 text-[0.9375rem] leading-relaxed text-[var(--site-muted)]">{text}</p>
                <Link href={href} className="site-btn site-btn-secondary site-btn-sm self-start px-5">
                  {cta}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[var(--site-bg)]">
        <div className={`${container} flex flex-col items-start gap-4 px-4 py-14 sm:px-6`}>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--site-navy)]">Want to see it in action?</h2>
          <p className="max-w-[600px] text-[0.9375rem] leading-relaxed text-[var(--site-muted)]">
            Tell us a little about yourself and we will walk you through the platform.
          </p>
          <Link href="/request-demo" className="site-btn site-btn-primary px-6">
            Request a Demo
          </Link>
        </div>
      </section>
    </>
  );
}
