/** Base skeleton block — a softly pulsing placeholder rectangle. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[var(--color-border)]/70 ${className}`} />;
}

/** Placeholder for a single folder/file row in BrowserTable or TrashPage. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-border)] py-3.5 last:border-0">
      <Skeleton className="h-5 w-5 shrink-0 rounded" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-[13px] w-[45%] max-w-56" />
        <Skeleton className="h-[10px] w-[30%] max-w-32" />
      </div>
    </div>
  );
}

/** A stack of row placeholders, staggered slightly so they don't all pulse in lockstep. */
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} style={{ animationDelay: `${index * 60}ms` }}>
          <SkeletonRow />
        </div>
      ))}
    </div>
  );
}
