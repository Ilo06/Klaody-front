interface LogoProps {
  className?: string;
}

export default function Logo({ className = "" }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-[0.4em] font-bold tracking-tight text-[var(--color-ink)] ${className}`}
      style={{ fontFamily: "var(--font-serif)" }}
    >
      <svg
        viewBox="0 0 58 34"
        aria-hidden="true"
        focusable="false"
        fill="currentColor"
        shapeRendering="crispEdges"
        style={{ height: "0.85em", width: "auto", flexShrink: 0 }}
      >
        <rect x="24" y="0" width="10" height="10" />
        <rect x="36" y="0" width="10" height="10" />
        <rect x="12" y="12" width="10" height="10" />
        <rect x="24" y="12" width="10" height="10" />
        <rect x="36" y="12" width="10" height="10" />
        <rect x="48" y="12" width="10" height="10" />
        <rect x="0" y="24" width="10" height="10" />
        <rect x="12" y="24" width="10" height="10" />
        <rect x="24" y="24" width="10" height="10" />
        <rect x="36" y="24" width="10" height="10" />
        <rect x="48" y="24" width="10" height="10" />
      </svg>
      <span>klaody</span>
    </span>
  );
}
