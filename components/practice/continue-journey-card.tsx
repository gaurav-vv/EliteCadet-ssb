import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { navIcons } from "@/components/ui/nav-icons";
import type { JourneyMission } from "@/types/practice";

// "Continue where you left off": the first self-paced bank with questions
// still to do, worked out on the server from the student's saved answers.
// Also used as "Today's Mission" on the student dashboard.
export function ContinueJourneyCard({ mission, heading = "Continue where you left off" }: { mission: JourneyMission; heading?: string }) {
  if (mission === null) return null;

  if (mission === "all-done") {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">{heading}</h2>
        <div className="glass-regular flex items-center gap-4 rounded-card px-6 py-5">
          <span className="glass-thin flex size-11 shrink-0 items-center justify-center rounded-full text-success">
            <PartyPopper aria-hidden="true" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Every practice bank is done</span>
            <span className="block text-[13px] text-ink-secondary">Revisit any day to keep sharpening, or check your final progress.</span>
          </span>
        </div>
      </section>
    );
  }

  const MissionIcon = navIcons.mission;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[18px] font-semibold text-ink">{heading}</h2>
      <Link href={mission.href} className="glass-hover-lift glass-regular flex items-center gap-4 rounded-card px-6 py-5 no-underline">
        <span className="glass-thin flex size-11 shrink-0 items-center justify-center rounded-full text-brand-accent">
          <MissionIcon aria-hidden="true" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">
            Day {mission.dayNumber} — {mission.title}
          </span>
          <span className="block text-[13px] text-ink-secondary">{mission.done > 0 ? `${mission.done} of ${mission.total} done — pick up where you stopped.` : "Start here."}</span>
        </span>
        <ArrowRight aria-hidden="true" size={18} className="shrink-0 text-brand-accent" />
      </Link>
    </section>
  );
}
