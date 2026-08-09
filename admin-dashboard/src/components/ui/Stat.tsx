import { cn } from "@/lib/utils";
import { Skeleton } from "./Skeleton";

interface StatProps {
  label: string;
  /** Pre-formatted numeric string; rendered in mono with tabular figures. */
  value?: string;
  unit?: string;
  hint?: string;
  loading?: boolean;
  /** Emphasize the headline figure (used for the primary number on a screen). */
  emphasis?: boolean;
  className?: string;
}

/**
 * Numbers are the product: amounts get a disciplined mono treatment and a quiet
 * label above them, never buried inside decorative chrome.
 */
export function Stat({
  label,
  value,
  unit,
  hint,
  loading,
  emphasis,
  className,
}: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {loading ? (
        <Skeleton className={emphasis ? "h-9 w-40" : "h-7 w-24"} />
      ) : (
        <span
          className={cn(
            "font-mono font-medium tabular-nums leading-tight",
            emphasis ? "text-3xl" : "text-xl",
          )}
        >
          {value ?? "—"}
          {unit && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          )}
        </span>
      )}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
