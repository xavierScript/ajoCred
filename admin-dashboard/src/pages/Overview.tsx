import { Link } from "react-router-dom";
import { Building2, ShieldCheck, ArrowRight, Coins, AlertCircle } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CopyButton } from "@/components/ui/CopyButton";
import { useAdminCoop } from "@/hooks/useAdminCoop";
import { useCooperative, useCoopStats } from "@/hooks/useBackend";
import { useTokenDecimals, useTokenSymbol } from "@/hooks/useToken";
import { formatToken, shortenAddress } from "@/lib/utils";

export function OverviewPage() {
  const { selectedCoopId } = useAdminCoop();
  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();
  const dec = decimals as number | undefined;

  const { data: coop, isLoading: coopLoading } = useCooperative(selectedCoopId ?? undefined);
  const { data: stats, isLoading: statsLoading } = useCoopStats(selectedCoopId ?? undefined);

  if (!selectedCoopId) {
    return (
      <Page>
        <PageHeader eyebrow="Overview" title="Cooperative Pool Overview" />
        <Card>
          <CardBody className="py-12 text-center">
            <Building2 className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg font-semibold">No Cooperative Selected</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Select or register a cooperative pool to view stats and manage liquidity.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild>
                <Link to="/cooperatives">
                  Manage Cooperatives
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      </Page>
    );
  }

  const isLoading = coopLoading || statsLoading || dec === undefined;

  return (
    <Page>
      <PageHeader
        eyebrow={`Cooperative #${selectedCoopId}`}
        title="Pool Performance & Overview"
        description="Monitor liquidity, capacity limits, risk thresholds, and active status for this cooperative pool."
        actions={
          coop && (
            <Badge tone={coop.active ? "success" : "warning"}>
              {coop.active ? "Active Pool" : "Inactive"}
            </Badge>
          )
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardBody>
            <Stat
              label="Total Pool Liquidity"
              value={formatToken(stats?.totalLiquidity, dec ?? 6)}
              unit={symbol}
              loading={isLoading}
              emphasis
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat
              label="Max Liquidity Ceiling"
              value={formatToken(stats?.maxLiquidity, dec ?? 6)}
              unit={symbol}
              loading={isLoading}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat
              label="Available Capacity"
              value={formatToken(stats?.availableCapacity, dec ?? 6)}
              unit={symbol}
              loading={isLoading}
            />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat
              label="Min A-Pass Tier"
              value={stats?.minTier?.toString() ?? "0"}
              unit="Tier"
              loading={isLoading}
            />
          </CardBody>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <CardTitle>Pool Configuration</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm text-muted-foreground">Cooperative ID</span>
              <span className="font-display font-semibold">#{selectedCoopId}</span>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm text-muted-foreground">Admin Wallet</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{shortenAddress(coop?.admin)}</span>
                {coop?.admin && <CopyButton value={coop.admin} />}
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm text-muted-foreground">Compliance Verification</span>
              <Badge tone="success" dot>Enabled (Validator)</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Interest Structure</span>
              <span className="text-sm font-medium">Flat repayment fee (5%)</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Coins className="size-5 text-accent" />
            <CardTitle>Quick Management Actions</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Button asChild block variant="outline">
              <Link to="/fund">
                <Coins className="size-4" />
                Deposit / Withdraw Pool Liquidity
              </Link>
            </Button>
            <Button asChild block variant="outline">
              <Link to="/members">
                <ShieldCheck className="size-4" />
                Inspect Members & Set Credit Caps
              </Link>
            </Button>
            <Button asChild block variant="outline">
              <Link to="/ramp">
                <Coins className="size-4" />
                Fiat On-Ramp / Off-Ramp Treasury
              </Link>
            </Button>
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
