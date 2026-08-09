import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Building2, CheckCircle2 } from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { SegmentedControl } from "@/components/pool/SegmentedControl";
import { AmountField } from "@/components/pool/AmountField";
import { TxStatus } from "@/components/pool/TxStatus";
import { FaucetCard } from "@/components/pool/FaucetCard";
import { useAdminCoop } from "@/hooks/useAdminCoop";
import { useCoopStats } from "@/hooks/useBackend";
import {
  useTokenDecimals,
  useTokenSymbol,
  useTokenBalance,
  useTokenAllowance,
  useApproveToken,
} from "@/hooks/useToken";
import { usePoolAction } from "@/hooks/usePool";
import { useAmountInput } from "@/hooks/useAmountInput";
import { formatToken, humanizeError } from "@/lib/utils";

type Mode = "deposit" | "withdraw";

export function FundPoolPage() {
  const { address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedCoopId } = useAdminCoop();
  const [mode, setMode] = useState<Mode>("deposit");

  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();
  const dec = decimals as number | undefined;

  const { balance, refetch: refetchBalance } = useTokenBalance(address);
  const { allowance, refetch: refetchAllowance } = useTokenAllowance(address);
  const { data: stats, refetch: refetchStats } = useCoopStats(selectedCoopId ?? undefined);

  const approve = useApproveToken();
  const write = usePoolAction(mode);

  const pendingAutoDepositRef = useRef<bigint | null>(null);

  const refetchAll = () => {
    queryClient.invalidateQueries();
    refetchBalance();
    refetchAllowance();
    refetchStats();
  };

  // Remaining capacity under cooperative ceiling
  const availableCapacity =
    stats?.maxLiquidity !== undefined && stats?.totalLiquidity !== undefined
      ? BigInt(stats.maxLiquidity) > BigInt(stats.totalLiquidity)
        ? BigInt(stats.maxLiquidity) - BigInt(stats.totalLiquidity)
        : 0n
      : undefined;

  // Deposit max is min(wallet balance, available capacity)
  const depositMax =
    balance !== undefined && availableCapacity !== undefined
      ? balance < availableCapacity
        ? balance
        : availableCapacity
      : balance;

  // Withdraw max is total liquidity in the coop pool
  const withdrawMax = stats?.totalLiquidity !== undefined ? BigInt(stats.totalLiquidity) : undefined;

  const max = mode === "deposit" ? depositMax : withdrawMax;

  const { value, setValue, parsed, error, setMax, reset } = useAmountInput({
    decimals: dec,
    max,
  });

  const hasAmount = parsed !== null && parsed > 0n;

  const needsApproval =
    mode === "deposit" &&
    hasAmount &&
    allowance !== undefined &&
    allowance < parsed;

  // Automated transaction chaining: when approval confirms on-chain, automatically execute deposit
  const approvedHandled = useRef(false);
  useEffect(() => {
    if (approve.isSuccess && !approvedHandled.current) {
      approvedHandled.current = true;
      void queryClient.invalidateQueries();
      void refetchAllowance();

      if (pendingAutoDepositRef.current !== null && selectedCoopId) {
        const amountToDeposit = pendingAutoDepositRef.current;
        pendingAutoDepositRef.current = null;
        toast({
          tone: "success",
          title: "Approval confirmed",
          description: `aUSDC approved! Opening wallet for Deposit transaction...`,
        });
        write.execute(BigInt(selectedCoopId), amountToDeposit);
      }
    }
    if (!approve.isSuccess) {
      approvedHandled.current = false;
    }
  }, [approve.isSuccess, refetchAllowance, queryClient, selectedCoopId, write, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoopId || !hasAmount || parsed === null) return;

    if (needsApproval) {
      pendingAutoDepositRef.current = parsed;
      approve.approve(parsed);
    } else {
      pendingAutoDepositRef.current = null;
      write.execute(BigInt(selectedCoopId), parsed);
    }
  };

  if (!selectedCoopId) {
    return (
      <Page>
        <PageHeader eyebrow="Treasury" title="Fund Cooperative Pool" />
        <Card>
          <CardBody className="py-12 text-center">
            <Building2 className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-display text-lg font-semibold">Select a Cooperative</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Select or register a cooperative pool before funding or withdrawing liquidity.
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

  const isSubmitting = approve.isPending || write.isSubmitting || write.isConfirming;
  const isSuccess = write.isSuccess;

  const buttonLabel =
    mode === "deposit"
      ? hasAmount
        ? needsApproval
          ? `Step 1 of 2: Approve ${symbol}`
          : `Step 2 of 2: Deposit ${symbol} to Pool`
        : `Deposit ${symbol} to Pool`
      : `Withdraw ${symbol} from Pool`;

  return (
    <Page>
      <PageHeader
        eyebrow={`Cooperative #${selectedCoopId}`}
        title="Pool Treasury & Liquidity"
        description="Deposit aUSDC to increase credit availability for members, or withdraw available pool funds."
      />

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left: Pool & Wallet Stats + Faucet Funding Card */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Coins className="size-5 text-primary" />
              <CardTitle>Treasury Status</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              <Stat
                label="Cooperative Pool Liquidity"
                value={formatToken(stats?.totalLiquidity, dec ?? 6)}
                unit={symbol}
                emphasis
              />
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <Stat
                  label="Your Wallet Balance"
                  value={formatToken(balance, dec ?? 6)}
                  unit={symbol}
                />
                <Stat
                  label="Deposit Capacity Left"
                  value={formatToken(availableCapacity, dec ?? 6)}
                  unit={symbol}
                />
              </div>
            </CardBody>
          </Card>

          {/* Testnet Faucet & Deposit Address Card for Admin Pool Funding */}
          {address && <FaucetCard account={address} onFunded={refetchAll} />}
        </div>

        {/* Right: Deposit / Withdraw Form */}
        <Card>
          <CardBody className="space-y-6">
            <SegmentedControl<Mode>
              ariaLabel="Choose deposit or withdraw"
              value={mode}
              onChange={(m) => {
                setMode(m);
                reset();
                write.reset();
              }}
              options={[
                { value: "deposit", label: "Deposit Liquidity" },
                { value: "withdraw", label: "Withdraw Liquidity" },
              ]}
            />

            {isSuccess ? (
              <div className="space-y-4 py-4 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="font-display text-lg font-semibold">
                  {mode === "deposit" ? "Deposit Successful" : "Withdrawal Successful"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  The cooperative pool balance has been updated on-chain.
                </p>
                <Button
                  onClick={() => {
                    reset();
                    write.reset();
                    refetchAll();
                  }}
                >
                  Make Another Transaction
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <AmountField
                  label={mode === "deposit" ? "Amount to Deposit" : "Amount to Withdraw"}
                  value={value}
                  onChange={setValue}
                  symbol={symbol}
                  max={max}
                  maxLabel={mode === "deposit" ? "Max available" : "Pool balance"}
                  decimals={dec}
                  onMax={setMax}
                />

                {error && <p className="text-xs font-medium text-destructive">{error}</p>}

                <Button
                  type="submit"
                  block
                  loading={isSubmitting}
                  disabled={!hasAmount || !!error || !address}
                >
                  {buttonLabel}
                </Button>

                {(write.error || approve.error) && (
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                    {humanizeError(write.error || approve.error)}
                  </div>
                )}

                {(write.hash || approve.hash) && (
                  <TxStatus
                    isSubmitting={write.isSubmitting || approve.isPending}
                    isConfirming={write.isConfirming}
                    isSuccess={write.isSuccess}
                    hash={(write.hash || approve.hash)!}
                    successLabel={mode === "deposit" ? "Deposit" : "Withdrawal"}
                  />
                )}
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
