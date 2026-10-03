import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { IconTile } from "@/components/academy/shared/icon-tile";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardTask } from "@/types/academy";

export function TodayTasks({ tasks }: { tasks: DashboardTask[] }) {
  return (
    <ChartCard title="Today's Tasks">
      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 aria-hidden="true" size={22} />}
          title="You're all caught up"
          description="Nothing needs action right now."
        />
      ) : (
        <ul className="flex flex-col">
          {tasks.map((task) => (
            <li key={task.id} className="border-b border-hairline last:border-0">
              <Link href={task.href} className="row-hover-tint -mx-2 flex min-h-14 items-center gap-3 rounded-control px-2 py-3 no-underline">
                <IconTile icon={task.icon} tone={task.tone} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-medium text-ink">
                    {task.title}
                    <span className="sr-only"> — {task.priority} priority</span>
                  </span>
                  <span className="line-clamp-2 text-[12px] text-ink-secondary">{task.description}</span>
                </span>
                <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
