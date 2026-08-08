import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  History,
  Coins,
} from "lucide-react";
import { Page, PageHeader } from "@/components/layout/Page";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Stat";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/StateViews";
import { ComplianceBadge } from "@/components/dashboard/ComplianceBadge";
import { EligibilityCard } from "@/components/dashboard/EligibilityCard";
import { TxHistoryTable } from "@/components/dashboard/TxHistoryTable";
import { usePoolStats, usePoolPosition } from "@/hooks/usePool";
import { useTokenDecimals, useTokenSymbol, useTokenBalance } from "@/hooks/useToken";
import { useEligibility, useTransactions, useVerify } from "@/hooks/useBackend";
import { formatToken, shortenAddress, humanizeError } from "@/lib/utils";

export function DashboardPage() {
  const { address } = useAccount();

  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();
  const { balance, isLoading: balanceLoading } = useTokenBalance(address);

  const position = usePoolPosition(address);
  const stats = usePoolStats();
  const verify = useVerify(address);
  const eligibility = useEligibility(address);
  const transactions = useTransactions(address);

  const dec = decimals as number | undefined;

  return (
    <Page>
      <PageHeader
        eyebrow="Dashboard"
        title="Your position"
        description="Your verified remittance history, on-chain balances, and available credit."
        actions={
          <div className="flex items-center gap-3">
            <ComplianceBadge valid={verify.data?.valid} isLoading={verify.isLoading} />
          </div>
        }
      />

      {/* Wallet address strip */}
      {address && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">
          <Wallet className="size-4 text-muted-foreground" />
          <span className="font-mono">{shortenAddress(address)}</span>
          <CopyButton value={address} />
        </div>
      )}

      {/* Position + wallet balance */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PositionStat
          label="Deposited"
          value={dec !== undefined ? formatToken(position.deposit, dec) : undefined}
          unit={symbol}
          loading={position.isLoading || dec === undefined}
        />
        <PositionStat
          label="Outstanding loan"
          value={dec !== undefined ? formatToken(position.borrowing, dec) : undefined}
          unit={symbol}
          loading={position.isLoading || dec === undefined}
        />
        <PositionStat
          label="On-chain cap"
          value={dec !== undefined ? formatToken(position.borrowingCap, dec) : undefined}
          unit={symbol}
          loading={position.isLoading || dec === undefined}
        />
        <PositionStat
          label="Wallet balance"
          value={dec !== undefined ? formatToken(balance, dec) : undefined}
          unit={symbol}
          loading={balanceLoading || dec === undefined}
        />
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/deposit">
            <ArrowDownToLine className="size-4" />
            Deposit
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/borrow">
            <ArrowUpFromLine className="size-4" />
            Borrow
          </Link>
        </Button>
      </div>

      {/* Eligibility + pool health */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <section>
          {eligibility.isLoading ? (
            <Card>
              <CardBody className="space-y-4">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-24 w-full" />
              </CardBody>
            </Card>
          ) : eligibility.error ? (
            <Card>
              <CardBody>
                <ErrorState
                  message={humanizeError(eligibility.error)}
                  onRetry={() => eligibility.refetch()}
                />
              </CardBody>
            </Card>
          ) : eligibility.data ? (
            <EligibilityCard data={eligibility.data} />
          ) : null}
        </section>

        <section>
          <Card className="h-full">
            <CardHeader className="flex-row items-center gap-2">
              <Coins className="size-4 text-muted-foreground" />
              <CardTitle>Pool liquidity</CardTitle>
            </CardHeader>
            <CardBody className="space-y-5">
              {stats.error ? (
                <ErrorState
                  message={humanizeError(stats.error)}
                  onRetry={() => stats.refetch()}
                />
              ) : (
                <>
                  <Stat
                    label="Available to borrow"
                    value={dec !== undefined ? formatToken(stats.availableLiquidity, dec) : undefined}
                    unit={symbol}
                    loading={stats.isLoading || dec === undefined}
                    emphasis
                  />
                  <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                    <Stat
                      label="Total deposits"
                      value={dec !== undefined ? formatToken(stats.totalDeposits, dec) : undefined}
                      unit={symbol}
                      loading={stats.isLoading || dec === undefined}
                    />
                    <Stat
                      label="Total borrowed"
                      value={dec !== undefined ? formatToken(stats.totalBorrowings, dec) : undefined}
                      unit={symbol}
                      loading={stats.isLoading || dec === undefined}
                    />
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </section>
      </div>

      {/* Remittance history */}
      <section className="mt-8">
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <CardTitle>Remittance history</CardTitle>
          </CardHeader>
          <CardBody>
            {transactions.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.error ? (
              <ErrorState
                message={humanizeError(transactions.error)}
                onRetry={() => transactions.refetch()}
              />
            ) : !transactions.data || !transactions.data.txs?.length ? (
              <EmptyState
                icon={<History className="size-6" />}
                title="No remittances yet"
                description="Once you receive verified inbound transfers, they'll appear here and build your borrowing limit."
              />
            ) : (
              <TxHistoryTable txs={transactions.data.txs} account={address!} />
            )}
          </CardBody>
        </Card>
      </section>
    </Page>
  );
}

function PositionStat({
  label,
  value,
  unit,
  loading,
}: {
  label: string;
  value?: string;
  unit: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <Stat label={label} value={value} unit={unit} loading={loading} />
      </CardBody>
    </Card>
  );
}
