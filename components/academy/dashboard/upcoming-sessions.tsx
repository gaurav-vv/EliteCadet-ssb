import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIstDay } from "@/lib/server/sessions/validation";
import type { SessionRecord } from "@/types/sessions";

const TIME = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

export function UpcomingSessions({ sessions }: { sessions: SessionRecord[] }) {
  return (
    <ChartCard title="Upcoming Sessions" action={{ label: "View All", href: "/academy/sessions" }} className="md:col-span-2 xl:col-span-1">
      {sessions.length === 0 ? (
        <EmptyState icon={<CalendarClock aria-hidden="true" size={22} />} title="No upcoming sessions" description="Sessions your mentors schedule appear here." />
      ) : (
        <ol className="flex flex-col">
          {sessions.map((s, index) => (
            <li key={s.id} className="grid grid-cols-[84px_16px_1fr] gap-x-3">
              <div className="pt-0.5 text-right">
                <p className="text-[13px] font-semibold text-ink">{TIME.format(new Date(s.startsAt))} IST</p>
                <p className="text-[12px] text-ink-secondary">{formatIstDay(s.startsAt).replace(/,? \d{4}$/, "")}</p>
              </div>
              <div className="flex flex-col items-center" aria-hidden="true">
                <span className="mt-1.5 size-3 rounded-full border-2 border-brand-accent bg-white" />
                {index < sessions.length - 1 && <span className="mt-1 w-px flex-1 bg-hairline" />}
              </div>
              <Link href={`/academy/sessions?batch=${s.batchId}`} className="min-w-0 pb-5 no-underline">
                <p className="truncate text-[14px] font-medium text-ink">{s.title}</p>
                <p className="text-[12px] text-ink-secondary">{s.batchName ?? "Batch"}{s.mentorName ? ` · ${s.mentorName}` : ""}</p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </ChartCard>
  );
}
