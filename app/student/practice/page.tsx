import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { navIcons } from "@/components/ui/nav-icons";

export const metadata: Metadata = { title: "Practice" };

export default function PracticePage() {
  const PsychologyIcon = navIcons.psychology;
  const InterviewIcon = navIcons.interview;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Practice" subtitle="Choose a category to start practicing." />

      <ListPanel>
        <ListRow href="/student/practice/psychology">
          <span className="flex items-center gap-3 text-sm font-medium text-ink">
            <PsychologyIcon aria-hidden="true" size={18} className="text-ink-secondary" />
            Psychology
          </span>
          <span className="text-xs text-ink-secondary">TAT, WAT, SRT and SDT</span>
        </ListRow>
        <ListRow href="/student/practice/interview">
          <span className="flex items-center gap-3 text-sm font-medium text-ink">
            <InterviewIcon aria-hidden="true" size={18} className="text-ink-secondary" />
            Interview
          </span>
          <span className="text-xs text-ink-secondary">Coming soon</span>
        </ListRow>
      </ListPanel>
    </div>
  );
}
