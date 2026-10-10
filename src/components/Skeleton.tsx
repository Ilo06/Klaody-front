import { BENTO_GRID, bentoSpan } from "../lib/bento";

/** Base skeleton block — a softly pulsing placeholder rectangle. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[var(--color-border)]/70 ${className}`} />;
}

/** Placeholder for a single folder/file row in BrowserTable or TrashPage. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--color-border)] py-2 last:border-0 sm:gap-3 sm:py-3.5">
      <Skeleton className="h-4 w-4 shrink-0 rounded sm:h-5 sm:w-5" />
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

/** Placeholder for the bento image grid shown while a content search is running. */
export function SkeletonGrid({ count = 9 }: { count?: number }) {
  return (
    <div className={BENTO_GRID} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        // staggered so the tiles don't pulse in lockstep
        <div
          key={index}
          className={`animate-pulse rounded-lg bg-[var(--color-border)]/70 ${bentoSpan(index)}`}
          style={{ animationDelay: `${index * 60}ms` }}
        />
      ))}
    </div>
  );
}
