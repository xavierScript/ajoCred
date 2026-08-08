import { useState } from "react";
import { useAccount } from "wagmi";
import { ArrowDownToLine } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { ComplianceBadge } from "@/components/dashboard/ComplianceBadge";
import { SegmentedControl } from "@/components/pool/SegmentedControl";
import { ActionForm } from "@/components/pool/ActionForm";
import { FaucetCard } from "@/components/pool/FaucetCard";
import { usePoolStats, usePoolPosition } from "@/hooks/usePool";
import { useTokenDecimals, useTokenSymbol, useTokenBalance } from "@/hooks/useToken";
import { useVerify } from "@/hooks/useBackend";
import { formatToken } from "@/lib/utils";

type Mode = "deposit" | "withdraw";

export function DepositPage() {
  const { address } = useAccount();
  const [mode, setMode] = useState<Mode>("deposit");

  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();
  const dec = decimals as number | undefined;

  const balance = useTokenBalance(address);
  const position = usePoolPosition(address);
  const stats = usePoolStats();
  const verify = useVerify(address);

  const compliant = verify.data?.valid ?? false;

  // Withdrawals are bounded by both the user's deposit and pool liquidity.
  const withdrawMax =
    position.deposit !== undefined && stats.availableLiquidity !== undefined
      ? position.deposit < stats.availableLiquidity
        ? position.deposit
        : stats.availableLiquidity
      : position.deposit;

  const refetchAll = () => {
    balance.refetch();
    position.refetch();
    stats.refetch();
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Liquidity"
        title="Provide liquidity"
        description="Deposit aUSDC into the compliance-gated pool. Every borrower is A-Pass verified before they can draw."
        actions={<ComplianceBadge valid={verify.data?.valid} isLoading={verify.isLoading} />}
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left: your LP position + pool health */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <ArrowDownToLine className="size-4 text-muted-foreground" />
              <CardTitle>Your liquidity</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <Stat
                label="Your deposit"
                value={dec !== undefined ? formatToken(position.deposit, dec) : undefined}
                unit={symbol}
                loading={position.isLoading || dec === undefined}
                emphasis
              />
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <Stat
                  label="Wallet balance"
                  value={dec !== undefined ? formatToken(balance.balance, dec) : undefined}
                  unit={symbol}
                  loading={balance.isLoading || dec === undefined}
                />
                <Stat
                  label="Pool liquidity"
                  value={dec !== undefined ? formatToken(stats.availableLiquidity, dec) : undefined}
                  unit={symbol}
                  loading={stats.isLoading || dec === undefined}
                />
              </div>
            </CardBody>
          </Card>

          {address && <FaucetCard account={address} onFunded={refetchAll} />}
        </div>

        {/* Right: action form */}
        <Card>
          <CardBody className="space-y-6">
            <SegmentedControl<Mode>
              ariaLabel="Choose deposit or withdraw"
              value={mode}
              onChange={setMode}
              options={[
                { value: "deposit", label: "Deposit" },
                { value: "withdraw", label: "Withdraw" },
              ]}
            />

            {mode === "deposit" ? (
              <ActionForm
                action="deposit"
                needsApproval
                account={address}
                decimals={dec}
                symbol={symbol}
                max={balance.balance}
                maxLabel="Wallet balance"
                fieldLabel="Amount to deposit"
                submitLabel="Deposit"
                successLabel="Deposit"
                disabled={!compliant}
                disabledReason={
                  verify.isLoading
                    ? undefined
                    : "You must be compliance-verified to deposit. Complete verification first."
                }
                onSuccess={refetchAll}
              />
            ) : (
              <ActionForm
                action="withdraw"
                needsApproval={false}
                account={address}
                decimals={dec}
                symbol={symbol}
                max={withdrawMax}
                maxLabel="Available to withdraw"
                fieldLabel="Amount to withdraw"
                submitLabel="Withdraw"
                successLabel="Withdrawal"
                disabled={!compliant}
                disabledReason={
                  verify.isLoading
                    ? undefined
                    : "You must be compliance-verified to withdraw."
                }
                onSuccess={refetchAll}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
