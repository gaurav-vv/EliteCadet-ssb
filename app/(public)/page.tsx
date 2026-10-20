import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  ChartLine,
  ClipboardCheck,
  ClipboardList,
  MessageSquareText,
  School,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  Users,
  UsersRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import heroCadets from "@/public/images/landing/hero-cadets.jpg";
import demoCall from "@/public/images/landing/demo-call.jpg";
import memberLogin from "@/public/images/landing/member-login.jpg";
import studentsPhoto from "@/public/images/landing/students.jpg";
import mentorsPhoto from "@/public/images/landing/mentors.jpg";
import academicsPhoto from "@/public/images/landing/academics.jpg";

export const metadata: Metadata = {
  title: { absolute: "EliteCadet — SSB Mentorship, Practice & Progress" },
  description:
    "Connect with experienced defence mentors, practise through live sessions, and build the confidence to join the armed forces.",
};

type Benefit = { icon: LucideIcon; label: string };

const heroBenefits: Benefit[] = [
  { icon: CalendarCheck, label: "Live 1-on-1 & group sessions" },
  { icon: Users, label: "Experienced defence mentors" },
  { icon: ClipboardList, label: "Structured SSB preparation" },
  { icon: TrendingUp, label: "Track your progress" },
];

type Accent = "blue" | "green" | "gold";

const accentClass: Record<Accent, string> = {
  blue: "text-[var(--site-accent-blue)]",
  green: "text-[var(--site-accent-green)]",
  gold: "text-[var(--site-accent-gold)]",
};

const roleSections: {
  id: string;
  eyebrow: string;
  title: string;
  accentText: string;
  accent: Accent;
  description: string;
  cta: { label: string; href: string };
  photo: StaticImageData;
  photoAlt: string;
  benefits: Benefit[];
}[] = [
  {
    id: "students",
    eyebrow: "For Students",
    title: "Learn. Practise.",
    accentText: "Grow.",
    accent: "blue",
    description:
      "Get mentored by experienced defence officers, attend live sessions, practise SSB modules, and receive personalised feedback.",
    cta: { label: "Explore as a Student", href: "/signup" },
    photo: studentsPhoto,
    photoAlt: "A student taking notes beside a laptop",
    benefits: [
      { icon: Video, label: "Live mentor sessions" },
      { icon: ClipboardList, label: "Structured SSB practice" },
      { icon: MessageSquareText, label: "Personalised feedback" },
      { icon: ChartLine, label: "Track your progress" },
    ],
  },
  {
    id: "mentors",
    eyebrow: "For Mentors",
    title: "Guide. Inspire.",
    accentText: "Make an Impact.",
    accent: "green",
    description:
      "Share your experience, mentor aspiring candidates, conduct live sessions, and help build the next generation of defence leaders.",
    cta: { label: "Join as a Mentor", href: "/request-demo?interest=mentor" },
    photo: mentorsPhoto,
    photoAlt: "A mentor explaining a point during an online session",
    benefits: [
      { icon: UsersRound, label: "Host 1-on-1 & group sessions" },
      { icon: BookOpen, label: "Access structured resources" },
      { icon: ClipboardCheck, label: "Track student progress" },
      { icon: Users, label: "Be part of a growing community" },
    ],
  },
  {
    id: "academics",
    eyebrow: "For Academics",
    title: "Empower",
    accentText: "Your Institution",
    accent: "gold",
    description:
      "Provide your students with expert mentorship, structured SSB preparation, and measurable progress — all in one platform.",
    cta: { label: "Explore for Academics", href: "/signup?as=academy" },
    photo: academicsPhoto,
    photoAlt: "A defence academy building with the national flag",
    benefits: [
      { icon: School, label: "Onboard your institution" },
      { icon: UsersRound, label: "Manage students and mentors" },
      { icon: ChartColumn, label: "Track performance and reports" },
      { icon: SlidersHorizontal, label: "Customised programmes" },
    ],
  },
];

// What the platform offers — not usage figures. Real platform statistics are
// not published until verified numbers exist (AGENTS.md §2.5, §8).
const highlights = [
  { value: "1-on-1 & Group", label: "Live mentor sessions" },
  { value: "5-Day", label: "SSB practice journey" },
  { value: "Mentor-led", label: "Evaluations & feedback" },
  { value: "3 Roles", label: "Students · Mentors · Academies" },
];

const steps = [
  {
    title: "Create your account",
    description: "Sign up as a student, or set up your academy. Mentors join through their academy.",
  },
  {
    title: "Practise with guidance",
    description: "Work through the SSB practice journey and attend live sessions with your mentors.",
  },
  {
    title: "Track and improve",
    description: "See your progress, act on mentor feedback, and practise again with clear direction.",
  },
];

const container = "mx-auto w-full max-w-[1440px]";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--site-bg-soft)]">
        <div className={`${container} relative lg:min-h-[480px] xl:min-h-[600px]`}>
          <div className="relative aspect-[5/4] w-full sm:aspect-[16/10] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[58%]">
            <Image
              src={heroCadets}
              alt="Cadets in dress uniform facing a domed academy building"
              fill
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-[60%_center]"
            />
            <div aria-hidden="true" className="site-hero-fade absolute inset-0 hidden lg:block" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 px-4 py-10 sm:px-6 lg:w-[52%] lg:py-14 lg:pl-12 xl:py-20">
            <p className="site-eyebrow">Mentorship · Practice · Progress</p>
            <h1 className="text-[2.25rem] font-bold leading-[1.08] tracking-[-0.025em] text-[var(--site-navy)] sm:text-5xl lg:text-[2.5rem] xl:text-[3.5rem]">
              Your SSB Journey with the Right Guidance
            </h1>
            <p className="max-w-[34rem] text-base leading-relaxed text-[var(--site-text)] sm:text-lg">
              Connect with experienced defence mentors, practise through live sessions, and build the confidence to
              achieve your dream of joining the armed forces.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/request-demo" className="site-btn site-btn-primary">
                Request a Demo <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link href="/signup" className="site-btn site-btn-secondary">
                Sign Up / Login
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 lg:mt-10">
              {heroBenefits.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-[0.8125rem] leading-snug text-[var(--site-text)]">
                  <Icon aria-hidden="true" className="size-6 shrink-0 text-[var(--site-navy)]" strokeWidth={1.6} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Action panels */}
      <section className={`${container} grid gap-4 px-4 py-5 sm:px-6 md:grid-cols-2 lg:px-3`}>
        <ActionPanel
          tone="blue"
          icon={CalendarDays}
          title="Request a Demo"
          text="See how EliteCadet can support your institution or your SSB preparation journey."
          photo={demoCall}
          photoAlt="A mentor on a video call shown on a laptop"
        >
          <Link href="/request-demo" className="site-btn site-btn-primary site-btn-sm">
            Request Demo <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </ActionPanel>
        <ActionPanel
          tone="warm"
          icon={UserRound}
          title="Already a member?"
          text="Log in to your account or create a new one to start your journey."
          photo={memberLogin}
          photoAlt="A student working on a laptop"
        >
          <Link href="/login" className="site-btn site-btn-primary site-btn-sm px-6">
            Login
          </Link>
          <Link href="/signup" className="site-btn site-btn-secondary site-btn-sm px-6">
            Sign Up
          </Link>
        </ActionPanel>
      </section>

      {/* Students / Mentors / Academics */}
      <div className="flex flex-col gap-4 pb-4">
        {roleSections.map((section) => (
          <RoleSection key={section.id} {...section} />
        ))}
      </div>

      {/* Highlights strip (no invented statistics) */}
      <section aria-label="Platform highlights" className="bg-[var(--site-bg-soft)]">
        <ul className={`${container} grid grid-cols-2 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-12`}>
          {highlights.map(({ value, label }, i) => (
            <li
              key={label}
              className={`flex flex-col items-center gap-1 px-3 py-4 text-center ${i > 0 ? "md:border-l md:border-[var(--site-line)]" : ""} ${i % 2 === 1 ? "max-md:border-l max-md:border-[var(--site-line)]" : ""}`}
            >
              <span className="text-xl font-semibold tracking-tight text-[var(--site-navy)] sm:text-2xl">{value}</span>
              <span className="text-sm text-[var(--site-text)]">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-[var(--site-bg)]">
        <div className={`${container} px-4 py-14 sm:px-6 lg:px-12`}>
          <p className="site-eyebrow">How It Works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--site-navy)]">Three steps to start preparing</h2>
          <ol className="mt-8 grid gap-6 lg:grid-cols-3">
            {steps.map(({ title, description }, i) => (
              <li key={title} className="flex gap-4 rounded-[var(--site-radius-md)] bg-[var(--site-card)] p-6">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--site-navy)] text-sm font-semibold text-white"
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-[var(--site-navy)]">{title}</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-[var(--site-muted)]">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

function ActionPanel({
  tone,
  icon: Icon,
  title,
  text,
  photo,
  photoAlt,
  children,
}: {
  tone: "blue" | "warm";
  icon: LucideIcon;
  title: string;
  text: string;
  photo: StaticImageData;
  photoAlt: string;
  children: React.ReactNode;
}) {
  const bg = tone === "blue" ? "bg-[var(--site-panel-blue)]" : "bg-[var(--site-panel-warm)]";
  return (
    <div className={`${bg} relative flex overflow-hidden rounded-[var(--site-radius-md)]`}>
      <div className="relative z-10 flex flex-1 gap-4 p-6 sm:p-7 xl:gap-5">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-[var(--site-navy)] shadow-[var(--site-shadow)]"
        >
          <Icon className="size-7" strokeWidth={1.6} />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="mt-2 text-xl font-bold tracking-tight text-[var(--site-navy)] xl:text-2xl">{title}</h2>
          <p className="max-w-[21rem] text-[0.8125rem] leading-relaxed text-[var(--site-text)] xl:text-sm">{text}</p>
          <div className="mt-3 flex flex-wrap gap-3">{children}</div>
        </div>
      </div>
      <div className="relative hidden w-[32%] shrink-0 sm:block">
        <Image src={photo} alt={photoAlt} fill sizes="(min-width: 768px) 17vw, 34vw" className="object-cover" />
        <div aria-hidden="true" className={`${tone === "blue" ? "site-panel-fade-blue" : "site-panel-fade-warm"} absolute inset-0`} />
      </div>
    </div>
  );
}

function RoleSection({
  id,
  eyebrow,
  title,
  accentText,
  accent,
  description,
  cta,
  photo,
  photoAlt,
  benefits,
}: (typeof roleSections)[number]) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 bg-[var(--site-bg-soft)]">
      <div className={`${container} grid items-stretch md:grid-cols-[40%_1fr] lg:grid-cols-[27%_1fr_25%]`}>
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[300px]">
          <Image src={photo} alt={photoAlt} fill sizes="(min-width: 1024px) 30vw, (min-width: 768px) 40vw, 100vw" className="object-cover" />
        </div>
        <div className="flex flex-col justify-center gap-4 px-4 py-10 sm:px-6 md:px-10 lg:px-7 xl:px-12">
          <p className="site-eyebrow">{eyebrow}</p>
          <h2 id={`${id}-title`} className="text-3xl font-bold leading-tight tracking-[-0.03em] text-[var(--site-navy)] lg:text-[1.75rem] xl:text-[2.25rem]">
            {title} <span className={accentClass[accent]}>{accentText}</span>
          </h2>
          <p className="max-w-[36rem] text-base leading-relaxed text-[var(--site-text)]">{description}</p>
          <div className="mt-2">
            <Link href={cta.href} className="site-btn site-btn-primary">
              {cta.label} <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
        <div className="px-4 pb-10 sm:px-6 md:col-span-2 md:px-10 lg:col-span-1 lg:py-6 lg:pl-0 lg:pr-3">
          <ul className="grid h-full content-center gap-1 rounded-[var(--site-radius-md)] bg-[var(--site-card)] p-4 sm:grid-cols-2 lg:grid-cols-1 lg:px-3 xl:p-5">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label} className="flex min-h-11 items-center gap-3 px-1 py-2 text-sm text-[var(--site-text)] xl:gap-4 xl:px-2">
                <Icon aria-hidden="true" className="size-5 shrink-0 text-[var(--site-navy)]" strokeWidth={1.6} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
