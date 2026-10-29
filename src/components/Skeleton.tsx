import { BENTO_GRID, bentoSpan } from "../lib/bento";

/** Base skeleton block — a softly pulsing placeholder rectangle. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[var(--color-border)]/70 ${className}`} />;
}

/** Placeholder for a single folder/file row in BrowserTable or TrashPage. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-2 last:border-0 sm:px-0">
      <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 sm:py-3.5">
        {/* Mobile: same 40px icon tile as the real rows. */}
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-[var(--color-border)]/70 sm:h-5 sm:w-5 sm:rounded" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-[13px] w-[60%] max-w-56 sm:w-[45%]" />
          <Skeleton className="h-[10px] w-[38%] max-w-32 sm:w-[30%]" />
        </div>
      </div>
      {/* Mobile: placeholder for the 40px "more" / restore button. */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center sm:hidden">
        <div className="h-[18px] w-[4px] animate-pulse rounded-full bg-[var(--color-border)]/70" />
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
