// The submitted answers, collapsed by default so feedback stays first.
export function AttemptAnswers({ items }: { items: { prompt: string; response: string }[] }) {
  const answered = items.filter((i) => i.response.trim() !== "").length;
  return (
    <details className="glass-regular rounded-card px-6 py-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-ink">
        Answers ({answered} of {items.length} answered)
      </summary>
      <ol className="mt-3 flex flex-col gap-4">
        {items.map((it, i) => (
          <li key={i} className="flex flex-col gap-1">
            <p className="text-[13px] text-ink-secondary">
              {i + 1}. {it.prompt}
            </p>
            {it.response.trim() ? <p className="text-sm whitespace-pre-wrap text-ink">{it.response}</p> : <p className="text-sm text-ink-secondary italic">Not answered</p>}
          </li>
        ))}
      </ol>
    </details>
  );
}
