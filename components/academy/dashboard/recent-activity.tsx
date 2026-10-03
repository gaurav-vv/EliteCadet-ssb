import { ActivityItem } from "@/components/academy/shared/activity-item";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardActivity } from "@/types/academy";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function RecentActivity({ activity }: { activity: DashboardActivity[] }) {
  return (
    <ChartCard title="Recent Activity" action={{ label: "View All", href: "/academy/students" }}>
      {activity.length === 0 ? (
        <EmptyState title="No activity yet" description="Student practice shows up here." />
      ) : (
        <ul className="flex flex-col">
          {activity.map((a) => (
            <li key={a.studentId}>
              <ActivityItem
                name={a.fullName}
                description={a.description}
                timestamp={formatWhen(a.occurredAt)}
                badge={a.badge}
                href={`/academy/students/${a.studentId}`}
              />
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
