import { useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { ArrowUpFromLine, Info } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateViews";
import { ComplianceBadge } from "@/components/dashboard/ComplianceBadge";
import { SegmentedControl } from "@/components/pool/SegmentedControl";
import { ActionForm } from "@/components/pool/ActionForm";
import { CapActivation } from "@/components/pool/CapActivation";
import { SelectCoopPrompt } from "@/components/SelectCoopPrompt";
import { usePoolPosition } from "@/hooks/usePool";
import { useTokenDecimals, useTokenSymbol, useTokenBalance } from "@/hooks/useToken";
import { useVerify, useEligibility, useCoopStats } from "@/hooks/useBackend";
import { useSelectedCoop } from "@/hooks/useSelectedCoop";
import { INTEREST_BPS } from "@/lib/contracts";
import { formatToken, humanizeError } from "@/lib/utils";

type Mode = "borrow" | "repay";

export function BorrowPage() {
  const { address } = useAccount();
  const { coopId } = useSelectedCoop();
  const [mode, setMode] = useState<Mode>("borrow");

  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();
  const dec = decimals as number | undefined;

  const balance = useTokenBalance(address);
  const position = usePoolPosition(coopId ? BigInt(coopId) : undefined, address);
  const stats = useCoopStats(coopId ?? undefined);
  const verify = useVerify(address);
  const eligibility = useEligibility(address);

  const compliant = verify.data?.valid ?? false;

  // A cooperative's lendable pool is its totalLiquidity (base units, string).
  const poolLiquidity =
    stats.data?.totalLiquidity !== undefined
      ? BigInt(stats.data.totalLiquidity)
      : undefined;

  const refetchAll = () => {
    balance.refetch();
    position.refetch();
    stats.refetch();
  };

  // Borrowable = min(remaining cap, pool liquidity), where remaining cap = cap − outstanding.
  const remainingCap =
    position.borrowingCap !== undefined && position.borrowing !== undefined
      ? position.borrowingCap > position.borrowing
        ? position.borrowingCap - position.borrowing
        : 0n
      : undefined;

  const borrowMax =
    remainingCap !== undefined && poolLiquidity !== undefined
      ? remainingCap < poolLiquidity
        ? remainingCap
        : poolLiquidity
      : remainingCap;

  const capIsZero = position.borrowingCap !== undefined && position.borrowingCap === 0n;

  if (!coopId) {
    return (
      <SelectCoopPrompt
        title="Borrow"
        description="Borrowing draws from a cooperative's shared pool. Join one to see your limit and borrow."
      />
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Credit"
        title="Borrow against your history"
        description="Draw up to your approved limit from your cooperative's shared pool. No collateral required."
        actions={<ComplianceBadge valid={verify.data?.valid} isLoading={verify.isLoading} />}
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left: loan position + eligibility → cap activation */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <ArrowUpFromLine className="size-4 text-muted-foreground" />
              <CardTitle>Your loan</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <Stat
                label="Outstanding balance"
                value={dec !== undefined ? formatToken(position.borrowing, dec) : undefined}
                unit={symbol}
                loading={position.isLoading || dec === undefined}
                emphasis
              />
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <Stat
                  label="Approved credit limit"
                  value={dec !== undefined ? formatToken(position.borrowingCap, dec) : undefined}
                  unit={symbol}
                  loading={position.isLoading || dec === undefined}
                />
                <Stat
                  label="Available in pool"
                  value={dec !== undefined ? formatToken(poolLiquidity, dec) : undefined}
                  unit={symbol}
                  loading={stats.isLoading || dec === undefined}
                />
              </div>
            </CardBody>
          </Card>

          {/* Cap activation — only relevant for borrowing, and only when compliant */}
          {compliant && dec !== undefined && (
            <>
              {eligibility.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : eligibility.error ? (
                <ErrorState
                  message={humanizeError(eligibility.error)}
                  onRetry={() => eligibility.refetch()}
                />
              ) : eligibility.data && address ? (
                eligibility.data.eligible ? (
                  <CapActivation
                    account={address}
                    coopId={coopId}
                    decimals={dec}
                    symbol={symbol}
                    eligibilityLimit={eligibility.data.borrowingLimit}
                    onChainCap={position.borrowingCap}
                    onActivated={refetchAll}
                  />
                ) : (
                  <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-4">
                    <Info className="size-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">No borrowing limit yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        You need verified incoming money transfers to unlock credit.{" "}
                        <Link to="/dashboard" className="text-primary hover:underline">
                          View your history
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                )
              ) : null}
            </>
          )}
        </div>

        {/* Right: borrow / repay form */}
        <Card>
          <CardBody className="space-y-6">
            <SegmentedControl<Mode>
              ariaLabel="Choose borrow or repay"
              value={mode}
              onChange={setMode}
              options={[
                { value: "borrow", label: "Borrow" },
                { value: "repay", label: "Repay" },
              ]}
            />

            {mode === "borrow" ? (
              <ActionForm
                action="borrow"
                coopId={coopId}
                needsApproval={false}
                account={address}
                decimals={dec}
                symbol={symbol}
                max={borrowMax}
                maxLabel="Available to borrow"
                fieldLabel="Amount to borrow"
                submitLabel="Borrow"
                successLabel="Borrow"
                disabled={!compliant || capIsZero}
                disabledReason={
                  verify.isLoading
                    ? undefined
                    : !compliant
                      ? "Your identity must be verified before borrowing. Complete verification first."
                      : capIsZero
                        ? "Activate your credit limit before borrowing."
                        : undefined
                }
                onSuccess={refetchAll}
              />
            ) : (
              <ActionForm
                action="repay"
                coopId={coopId}
                needsApproval
                feeBps={INTEREST_BPS}
                account={address}
                decimals={dec}
                symbol={symbol}
                max={position.borrowing}
                maxLabel="Outstanding balance"
                fieldLabel="Amount to repay"
                submitLabel="Repay"
                successLabel="Repayment"
                onSuccess={refetchAll}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
