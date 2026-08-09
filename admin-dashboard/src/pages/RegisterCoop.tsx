import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Building2, Plus } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAdminCoop } from "@/hooks/useAdminCoop";
import { useCooperatives, useRegisterCooperative } from "@/hooks/useBackend";
import { useTokenDecimals, useTokenSymbol } from "@/hooks/useToken";
import { formatToken, humanizeError, parseToken, shortenAddress } from "@/lib/utils";

export function RegisterCoopPage() {
  const { address } = useAccount();
  const { selectedCoopId, selectCoop } = useAdminCoop();
  const { toast } = useToast();
  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();
  const dec = decimals as number | undefined;

  const { data: coops, isLoading, refetch } = useCooperatives();
  const registerMutation = useRegisterCooperative();

  const [adminAddress, setAdminAddress] = useState("");
  const [maxLiquidityInput, setMaxLiquidityInput] = useState("50000");
  const [minTierInput, setMinTierInput] = useState("0");

  useEffect(() => {
    if (address && !adminAddress) {
      setAdminAddress(address);
    }
  }, [address, adminAddress]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminAddress || !maxLiquidityInput || dec === undefined) return;

    try {
      const maxLiquidityBase = parseToken(maxLiquidityInput, dec).toString();
      const minTier = parseInt(minTierInput || "0", 10);

      const res = await registerMutation.mutateAsync({
        adminAddress,
        maxLiquidity: maxLiquidityBase,
        minTier,
      });

      toast({
        tone: "success",
        title: "Cooperative registered",
        description: `Cooperative #${res.coopId} created successfully on-chain!`,
      });

      selectCoop(res.coopId);
      await refetch();
    } catch (err) {
      toast({
        tone: "error",
        title: "Registration failed",
        description: humanizeError(err),
      });
    }
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Management"
        title="Cooperative Directory & Setup"
        description="Register a new credit pool for your cooperative or select an existing one to manage."
      />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left: Cooperative List */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                <CardTitle>Registered Cooperatives</CardTitle>
              </div>
              <Badge tone="neutral">{coops?.length ?? 0} pools</Badge>
            </CardHeader>
            <CardBody className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : !coops || coops.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No cooperatives registered yet. Use the form to launch the first pool.
                </div>
              ) : (
                coops.map((c) => {
                  const isSelected = selectedCoopId === c.id;
                  const isMyCoop = address && c.admin.toLowerCase() === address.toLowerCase();

                  return (
                    <div
                      key={c.id}
                      className={`flex flex-col gap-4 rounded-lg border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold">Cooperative #{c.id}</span>
                          {isMyCoop && <Badge tone="accent">Admin</Badge>}
                          {isSelected && <Badge tone="success">Active Selection</Badge>}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">
                          Admin: {shortenAddress(c.admin, 6)}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Size: {dec !== undefined ? formatToken(c.totalLiquidity, dec) : "—"} {symbol}
                          </span>
                          <span>
                            Cap: {dec !== undefined ? formatToken(c.maxLiquidity, dec) : "—"} {symbol}
                          </span>
                          <span>Min Tier: {c.minTier}</span>
                        </div>
                      </div>

                      <Button
                        variant={isSelected ? "outline" : "primary"}
                        size="sm"
                        onClick={() => selectCoop(c.id)}
                      >
                        {isSelected ? "Selected" : "Select & Manage"}
                      </Button>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right: Register New Cooperative */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Plus className="size-5 text-accent" />
              <CardTitle>Register New Cooperative</CardTitle>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  label="Cooperative Admin Address"
                  hint="The wallet address authorized to manage liquidity for this pool."
                  placeholder="0x..."
                  value={adminAddress}
                  onChange={(e) => setAdminAddress(e.target.value)}
                  required
                />

                <Input
                  label={`Max Liquidity Cap (${symbol})`}
                  hint="Capped pilot limit for this cooperative pool."
                  type="number"
                  placeholder="50000"
                  value={maxLiquidityInput}
                  onChange={(e) => setMaxLiquidityInput(e.target.value)}
                  required
                />

                <Input
                  label="Minimum A-Pass Risk Tier"
                  hint="Base risk tier threshold required to borrow from this pool (0 = default)."
                  type="number"
                  placeholder="0"
                  value={minTierInput}
                  onChange={(e) => setMinTierInput(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  variant="accent"
                  block
                  loading={registerMutation.isPending}
                  disabled={!adminAddress || dec === undefined}
                >
                  Register Cooperative On-Chain
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  );
}
