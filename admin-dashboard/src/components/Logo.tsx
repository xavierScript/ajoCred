import { cn } from "@/lib/utils";

/**
 * AjoCred mark — a segmented ring evoking an "ajo" rotating savings circle:
 * discrete members contributing to a shared pool. Uses currentColor so it
 * inherits the brand emerald wherever it's placed.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7", className)}
      fill="none"
      aria-hidden
    >
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        {/* Four arcs = members of the circle, with gaps between them. */}
        <path d="M16 4.5a11.5 11.5 0 0 1 8.13 3.37" />
        <path d="M27.5 16a11.5 11.5 0 0 1-3.37 8.13" />
        <path d="M16 27.5a11.5 11.5 0 0 1-8.13-3.37" />
        <path d="M4.5 16a11.5 11.5 0 0 1 3.37-8.13" />
      </g>
      {/* Center dot = the shared pool. */}
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo className="size-7 text-primary" />
      <span className="font-display text-xl font-semibold tracking-tight">
        AjoCred
      </span>
    </span>
  );
}
