import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { NotificationList } from "@/components/notifications/notification-list";
import { PageHeader } from "@/components/ui/page-header";
import { getMyNotifications, PAGE_LIMIT } from "@/lib/server/notifications/service";

// Shared by every role's /notifications route: always the caller's own rows.
export async function NotificationsPage() {
  const result = await getMyNotifications(PAGE_LIMIT);
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Notifications" subtitle="Updates about your sessions, assessments, feedback and batches." />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load notifications. Please try again."} />
      ) : (
        <NotificationList initial={result.data.items} />
      )}
    </div>
  );
}
