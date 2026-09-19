import Link from "next/link";

interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="glass-regular flex flex-col items-center gap-3 px-8 py-10">
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        <p className="text-sm text-ink-secondary">{description}</p>
        <Link href="/student" className="text-sm text-brand-accent hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
