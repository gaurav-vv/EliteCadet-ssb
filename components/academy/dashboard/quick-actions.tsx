import { QuickAction } from "@/components/academy/shared/quick-action";

// Shortcuts to the admin's most common jobs. Destinations are existing pages;
// "Manage Activities" has no page yet, so it renders disabled.
export function QuickActions() {
  return (
    <section aria-label="Quick actions" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <QuickAction title="Add New Student" description="Onboard a new student to your academy" href="/academy/students" icon="students" tone="indigo" />
      <QuickAction title="Create Batch" description="Create and manage batches" href="/academy/batches" icon="batches" tone="success" />
      <QuickAction title="Assign Mentor" description="Assign mentors to students or batches" href="/academy/batches" icon="mentors" tone="warning" />
      <QuickAction title="View Reports" description="Generate performance reports" href="/academy/reports" icon="reports" tone="info" />
      <QuickAction title="Manage Activities" description="Assign daily activities" href="/academy/activities" icon="activities" tone="danger" disabled />
    </section>
  );
}
