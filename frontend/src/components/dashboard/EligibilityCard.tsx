import { Link } from "react-router-dom";
import { TrendingUp, Users, Receipt, ArrowRight } from "lucide-react";
import type { EligibilityResult } from "@/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { formatAmount } from "@/lib/utils";

/**
 * Off-chain risk-engine result: the headline borrowing limit plus the inflow
 * figures that produced it, so the number is legible rather than a black box.
 * Cleanverse amounts are already human-unit numbers — formatted with formatAmount.
 */
export function EligibilityCard({ data }: { data: EligibilityResult }) {
  const { eligible, borrowingLimit, breakdown } = data;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Credit limit calculation</CardTitle>
        <Badge tone={eligible ? "success" : "warning"} dot>
          {eligible ? "Eligible" : "Not yet eligible"}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Stat
            label="Your calculated limit"
            value={formatAmount(borrowingLimit)}
            unit="USD"
            hint={`Based on ${breakdown.lookbackMonths} months of verified incoming transfers`}
            emphasis
          />
          {eligible && (
            <Button asChild variant="accent">
              <Link to="/borrow">
                Borrow now
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
          <Metric
            icon={<TrendingUp className="size-4" />}
            label="Total received"
            value={`${formatAmount(breakdown.totalInflow)} USD`}
          />
          <Metric
            icon={<Receipt className="size-4" />}
            label="Transfers received"
            value={String(breakdown.inflowTxCount)}
          />
          <Metric
            icon={<Users className="size-4" />}
            label="Unique senders"
            value={String(breakdown.uniqueSenders)}
          />
        </div>

        {!eligible && (
          <p className="text-sm text-muted-foreground">
            We couldn't find enough verified incoming money transfers to set a limit yet. As your
            transfer history grows, your limit will too.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 font-mono text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}
