// Footer for every signed-in workspace (Student, Mentor, Academy, Super Admin).
// Rendered once by WorkspaceLayout, so pages never add their own. Workspace
// tokens only: hairline border, ink-secondary text, no accent colour.
export function WorkspaceFooter({ workspaceLabel }: { workspaceLabel: string }) {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-1 px-4 py-4 text-[12px] text-ink-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          &copy; {new Date().getFullYear()} EliteCadet &middot; {workspaceLabel} workspace
        </p>
        <p>AI feedback assists your preparation. It is not an SSB selection outcome.</p>
      </div>
    </footer>
  );
}
