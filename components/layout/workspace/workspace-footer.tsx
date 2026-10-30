// Footer for every signed-in workspace (Student, Mentor, Academy, Super Admin).
// Rendered once by WorkspaceLayout, so pages never add their own. Dark navy to
// match the sidebar (`--academy-navy`, scoped to `.workspace-app`).
export function WorkspaceFooter({ workspaceLabel }: { workspaceLabel: string }) {
  return (
    <footer className="border-t border-(--academy-navy-line) bg-(--academy-navy) text-white/70">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 px-4 py-4 text-[12px] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-12">
        <p>
          &copy; {new Date().getFullYear()} EliteCadet &middot; {workspaceLabel} workspace
        </p>
        <p>AI feedback assists your preparation. It is not an SSB selection outcome.</p>
      </div>
    </footer>
  );
}
