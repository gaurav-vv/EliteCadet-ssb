export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg-ambient px-6">
      <div className="glass-surface flex max-w-md flex-col items-center gap-3 px-10 py-8 text-center">
        <p className="text-sm font-medium text-brand-navy">SSB Academy</p>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
          Coming soon
        </h1>
        <p className="text-sm text-text-muted">
          The public site is being built on top of the Glass Capsule design
          system (see <code>AGENTS.md</code> §7).
        </p>
      </div>
    </div>
  );
}
