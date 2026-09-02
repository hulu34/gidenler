export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-sunk ${className}`} aria-hidden />;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 border-t border-line py-12">
      <h3 className="font-[family-name:var(--font-ui)] text-lg font-bold tracking-tight">{title}</h3>
      {body && <p className="max-w-[52ch] text-[15px] text-ink-2">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-start gap-3 border-t-2 border-neg py-10">
      <span className="label" style={{ color: "var(--neg-ink)" }}>Bir sorun çıktı</span>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      {body && <p className="max-w-[52ch] text-[15px] text-ink-2">{body}</p>}
    </div>
  );
}
