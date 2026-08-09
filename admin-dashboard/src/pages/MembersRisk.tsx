import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Search,
  UserCheck,
  Snowflake,
  Sun,
  Sliders,
  Building2,
} from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Stat";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAdminCoop } from "@/hooks/useAdminCoop";
import {
  useCoopPosition,
  useEligibility,
  useVerify,
  useSetCap,
  useFreeze,
  useUnfreeze,
} from "@/hooks/useBackend";
import { useTokenDecimals, useTokenSymbol } from "@/hooks/useToken";
import { formatToken, formatAmount, humanizeError, parseToken, shortenAddress } from "@/lib/utils";

export function MembersRiskPage() {
  const { selectedCoopId } = useAdminCoop();
  const { toast } = useToast();
  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();
  const dec = decimals as number | undefined;

  const [searchAddress, setSearchAddress] = useState("");
  const [activeMember, setActiveMember] = useState<string | null>(null);
  const [capInput, setCapInput] = useState("");
  const [freezeReason, setFreezeReason] = useState("admin_default_freeze");

  const position = useCoopPosition(selectedCoopId ?? undefined, activeMember ?? undefined);
  const eligibility = useEligibility(activeMember ?? undefined);
  const verify = useVerify(activeMember ?? undefined);

  const setCapMutation = useSetCap();
  const freezeMutation = useFreeze();
  const unfreezeMutation = useUnfreeze();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress || !searchAddress.startsWith("0x")) {
      toast({ tone: "error", title: "Invalid address", description: "Enter a valid account address." });
      return;
    }
    setActiveMember(searchAddress.trim());
  };

  const handleSetCap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoopId || !activeMember || !capInput || dec === undefined) return;

    try {
      const capBase = parseToken(capInput, dec).toString();
      await setCapMutation.mutateAsync({
        coopId: selectedCoopId,
        address: activeMember,
        cap: capBase,
      });

      toast({
        tone: "success",
        title: "Borrowing limit updated",
        description: `Set credit limit of ${capInput} ${symbol} for ${shortenAddress(activeMember)}.`,
      });

      position.refetch();
      setCapInput("");
    } catch (err) {
      toast({ tone: "error", title: "Failed to update limit", description: humanizeError(err) });
    }
  };

  const handleFreeze = async () => {
    if (!activeMember) return;
    try {
      await freezeMutation.mutateAsync({ address: activeMember, reason: freezeReason });
      toast({
        tone: "warning",
        title: "Account frozen",
        description: `Frozen verification status for ${shortenAddress(activeMember)}. Verification revoked.`,
      });
      verify.refetch();
    } catch (err) {
      toast({ tone: "error", title: "Freeze failed", description: humanizeError(err) });
    }
  };

  const handleUnfreeze = async () => {
    if (!activeMember) return;
    try {
      await unfreezeMutation.mutateAsync(activeMember);
      toast({
        tone: "success",
        title: "Account unfrozen",
        description: `Restored verification status for ${shortenAddress(activeMember)}.`,
      });
      verify.refetch();
    } catch (err) {
      toast({ tone: "error", title: "Unfreeze failed", description: humanizeError(err) });
    }
  };

  if (!selectedCoopId) {
    return (
      <Page>
        <PageHeader eyebrow="Risk Management" title="Member Risk & Limits" />
        <Card>
          <CardBody className="py-12 text-center">
            <Building2 className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg font-semibold">Select a Cooperative</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Select or register a cooperative pool before inspecting member risk or setting limits.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild>
                <Link to="/cooperatives">Browse Cooperatives</Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      </Page>
    );
  }

  const isFrozen = verify.data && !verify.data.valid;

  return (
    <Page>
      <PageHeader
        eyebrow={`Cooperative #${selectedCoopId}`}
        title="Member Risk Inspector & Controls"
        description="Inspect borrowing history, evaluate creditworthiness, adjust borrowing limits, and handle defaults."
      />

      {/* Search Bar */}
      <Card className="mb-8">
        <CardBody>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Enter member account address (0x...)"
                className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none transition-colors focus:border-primary"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
              />
            </div>
            <Button type="submit" size="md">
              Inspect Member
            </Button>
          </form>
        </CardBody>
      </Card>

      {!activeMember ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <UserCheck className="mx-auto size-8 opacity-50" />
          <p className="mt-3 text-sm">Enter a member's address above to view position, credit history, and controls.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Member Info & Eligibility */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="size-5 text-primary" />
                  <CardTitle>Member Position & Status</CardTitle>
                </div>
                {verify.isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <Badge tone={isFrozen ? "destructive" : "success"} dot>
                    {isFrozen ? "Frozen / Defaulted" : "Verified"}
                  </Badge>
                )}
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="text-xs font-mono text-muted-foreground break-all">
                  {activeMember}
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                  <Stat
                    label="Coop Deposit"
                    value={formatToken(position.data?.deposit, dec ?? 6)}
                    unit={symbol}
                    loading={position.isLoading || dec === undefined}
                  />
                  <Stat
                    label="Outstanding Loan"
                    value={formatToken(position.data?.borrowing, dec ?? 6)}
                    unit={symbol}
                    loading={position.isLoading || dec === undefined}
                    emphasis
                  />
                  <Stat
                    label="Active Limit"
                    value={formatToken(position.data?.borrowingCap, dec ?? 6)}
                    unit={symbol}
                    loading={position.isLoading || dec === undefined}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Creditworthiness Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Verified Inbound History & Eligibility</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3 text-sm">
                {eligibility.isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : eligibility.data ? (
                  <>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Calculated Borrowing Limit</span>
                      <span className="font-semibold text-primary">
                        {formatAmount(eligibility.data.borrowingLimit)} USD
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Verified Total Received</span>
                      <span>{formatAmount(eligibility.data.breakdown.totalInflow)} USD</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Unique Senders</span>
                      <span>{eligibility.data.breakdown.uniqueSenders} senders</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Qualifying Transfers</span>
                      <span>{eligibility.data.breakdown.inflowTxCount} transfers</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No money transfer record found for this address.</p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Right Column: Actions */}
          <div className="space-y-6">
            {/* Set Cap Form */}
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <Sliders className="size-5 text-accent" />
                <CardTitle>Set Member Borrowing Limit</CardTitle>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSetCap} className="space-y-4">
                  <Input
                    label={`Max Borrowing Limit (${symbol})`}
                    hint="Calculated credit ceiling for this member in this coop."
                    type="number"
                    placeholder="e.g. 500"
                    value={capInput}
                    onChange={(e) => setCapInput(e.target.value)}
                    required
                  />

                  <Button
                    type="submit"
                    block
                    loading={setCapMutation.isPending}
                    disabled={!capInput || dec === undefined}
                  >
                    Set Member Credit Limit
                  </Button>
                </form>
              </CardBody>
            </Card>

            {/* Default & Freeze Handling */}
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <Snowflake className="size-5 text-destructive" />
                <CardTitle>Default & Freeze Controls</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Freezing a defaulted borrower's account immediately revokes access across all cooperative contract interactions.
                </p>

                {isFrozen ? (
                  <Button
                    variant="primary"
                    block
                    onClick={handleUnfreeze}
                    loading={unfreezeMutation.isPending}
                  >
                    <Sun className="size-4" />
                    Restore Verification / Unfreeze Member
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Input
                      label="Reason for Freeze"
                      placeholder="admin_default_freeze"
                      value={freezeReason}
                      onChange={(e) => setFreezeReason(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      block
                      onClick={handleFreeze}
                      loading={freezeMutation.isPending}
                    >
                      <Snowflake className="size-4" />
                      Freeze Account (Mark Defaulted)
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Page>
  );
}
