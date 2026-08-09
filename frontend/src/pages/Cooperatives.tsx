import { useAccount } from "wagmi";
import { Building2, Users, Shield } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/StateViews";
import { useCooperatives } from "@/hooks/useBackend";
import { useSelectedCoop } from "@/hooks/useSelectedCoop";
import { useTokenDecimals, useTokenSymbol } from "@/hooks/useToken";
import { formatToken, humanizeError } from "@/lib/utils";

export function CooperativesPage() {
  const { isConnected } = useAccount();
  const { coopId, setCoopId } = useSelectedCoop();
  const cooperatives = useCooperatives();
  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();

  const dec = decimals as number | undefined;

  return (
    <Page>
      <PageHeader
        eyebrow="Browse"
        title="Cooperatives"
        description="Choose a cooperative to join. Each one manages its own pool, sets its own risk tier, and supports its members' credit."
      />

      {!isConnected && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">
            Sign in with your account to join a cooperative and access your credit limit.
          </p>
        </div>
      )}

      {cooperatives.isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardBody>
                <Skeleton className="h-48 w-full" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : cooperatives.isError ? (
        <ErrorState
          title="Couldn't load cooperatives"
          message={humanizeError(cooperatives.error)}
          onRetry={cooperatives.refetch}
        />
      ) : cooperatives.data && cooperatives.data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cooperatives.data.map((coop) => {
            const isSelected = coopId === coop.id;
            const capacity = BigInt(coop.maxLiquidity) - BigInt(coop.totalLiquidity);
            const utilizationPct =
              BigInt(coop.maxLiquidity) > 0n
                ? Number((BigInt(coop.totalLiquidity) * 100n) / BigInt(coop.maxLiquidity))
                : 0;

            return (
              <Card key={coop.id} className={isSelected ? "ring-2 ring-primary" : undefined}>
                <CardHeader className="flex-row items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Cooperative {coop.id}</CardTitle>
                      {isSelected && (
                        <Badge tone="success" className="mt-1 text-[10px]">
                          Joined
                        </Badge>
                      )}
                    </div>
                  </div>
                  {coop.active ? (
                    <Badge tone="success" className="text-[10px]">
                      Active
                    </Badge>
                  ) : (
                    <Badge tone="neutral" className="text-[10px]">
                      Inactive
                    </Badge>
                  )}
                </CardHeader>

                <CardBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Stat
                      label="Pool size"
                      value={dec !== undefined ? formatToken(coop.totalLiquidity, dec) : undefined}
                      unit={symbol}
                      loading={dec === undefined}
                    />
                    <Stat
                      label="Capacity left"
                      value={dec !== undefined ? formatToken(capacity.toString(), dec) : undefined}
                      unit={symbol}
                      loading={dec === undefined}
                    />
                  </div>

                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pool utilization</span>
                      <span className="font-medium tabular-nums">{utilizationPct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <Shield className="size-3.5" />
                    <span>Min tier {coop.minTier}</span>
                  </div>

                  {isConnected && coop.active && (
                    <Button
                      block
                      size="sm"
                      variant={isSelected ? "outline" : "primary"}
                      onClick={() => setCoopId(isSelected ? null : coop.id)}
                    >
                      <Users className="size-3.5" />
                      {isSelected ? "Leave cooperative" : "Join cooperative"}
                    </Button>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="size-6" />}
          title="No cooperatives yet"
          description="Cooperatives are registered by the protocol admin. Check back soon."
        />
      )}
    </Page>
  );
}
