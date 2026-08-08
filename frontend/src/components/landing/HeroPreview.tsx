import { CheckCircle2, ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

/**
 * Concrete preview of the mechanism: verified inbound remittances on the left,
 * the borrowing limit they produce on the right. Grounded in real figures rather
 * than decorative — it shows a prospective user exactly what AjoCred reads.
 */
export function HeroPreview() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <span className="text-sm font-medium text-muted-foreground">
          Verified inbound remittances
        </span>
        <Badge tone="success" dot>
          A-Pass verified
        </Badge>
      </div>

      <ul className="divide-y divide-border">
        {RECEIPTS.map((r) => (
          <li key={r.from} className="flex items-center gap-3 px-5 py-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <ArrowDownLeft className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.from}</p>
              <p className="text-xs text-muted-foreground">{r.when}</p>
            </div>
            <span className="font-mono text-sm tabular-nums">
              +{r.amount}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-4 border-t border-border bg-muted/40 px-5 py-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-success" />
            Borrowing limit
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            From 6 months of inflows
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold tabular-nums">
            1,195
          </p>
          <p className="text-xs text-muted-foreground">USDC</p>
        </div>
      </div>
    </div>
  );
}

const RECEIPTS = [
  { from: "Adaeze O. · London", when: "2 days ago", amount: "220.00" },
  { from: "Kwame B. · Toronto", when: "1 week ago", amount: "180.00" },
  { from: "Chidi N. · Dubai", when: "3 weeks ago", amount: "310.00" },
];
