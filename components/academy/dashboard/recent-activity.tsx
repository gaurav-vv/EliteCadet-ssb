import { History } from "lucide-react";
import { ActivityItem } from "@/components/academy/shared/activity-item";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ActivityEntry } from "@/types/dashboards";

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));
}

export function RecentActivity({ activity }: { activity: ActivityEntry[] }) {
  return (
    <ChartCard title="Recent Activity" action={{ label: "View All", href: "/academy/students" }}>
      {activity.length === 0 ? (
        <EmptyState icon={<History aria-hidden="true" size={22} />} title="No activity yet" description="Students' assessment submissions show up here." />
      ) : (
        <ul className="flex flex-col">
          {activity.map((a) => (
            <li key={a.id}>
              <ActivityItem name={a.title} description={a.detail} timestamp={formatWhen(a.at)} href={a.href} />
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
