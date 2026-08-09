import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { Wallet, History, Coins, CreditCard } from "lucide-react";
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
import { DemoControls } from "@/components/dashboard/DemoControls";
import { usePoolPosition } from "@/hooks/usePool";
import { useTokenDecimals, useTokenSymbol, useTokenBalance } from "@/hooks/useToken";
import { useEligibility, useTransactions, useVerify } from "@/hooks/useBackend";
import { formatToken, shortenAddress, humanizeError } from "@/lib/utils";

export function DashboardPage() {
  const { address } = useAccount();

  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();
  const { balance, isLoading: balanceLoading } = useTokenBalance(address);

  const position = usePoolPosition(address);
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
            <Button asChild variant="outline" size="sm">
              <Link to="/ramp">
                <CreditCard className="size-3.5" />
                Fiat Ramp
              </Link>
            </Button>
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

      {/* Demo Controls (Feature #3) -- hidden unless VITE_ADMIN_KEY is set */}
      {address && <DemoControls address={address} />}

      {/* Top stat ridge */}
      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <Stat
              label={`${symbol ?? "aUSDC"} wallet balance`}
              value={
                balanceLoading || dec === undefined
                  ? undefined
                  : formatToken(balance, dec)
              }
              unit={symbol ?? "aUSDC"}
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat
              label="Your pool deposit"
              value={
                position.isLoading || dec === undefined
                  ? undefined
                  : formatToken(position.deposit, dec)
              }
              unit={symbol ?? "aUSDC"}
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat
              label="Active loan balance"
              value={
                position.isLoading || dec === undefined
                  ? undefined
                  : formatToken(position.borrowing, dec)
              }
              unit={symbol ?? "aUSDC"}
            />
          </CardBody>
        </Card>
      </div>

      {/* Eligibility card */}
      <div className="mb-6">
        {eligibility.isLoading ? (
          <Card>
            <CardBody>
              <Skeleton className="h-40 w-full" />
            </CardBody>
          </Card>
        ) : eligibility.isError ? (
          <ErrorState
            title="Couldn't load eligibility"
            message={humanizeError(eligibility.error)}
            onRetry={eligibility.refetch}
          />
        ) : eligibility.data ? (
          <EligibilityCard data={eligibility.data} />
        ) : null}
      </div>

      {/* Transaction history */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            <History className="mr-2 inline size-4 text-muted-foreground" />
            Verified remittance history
          </CardTitle>
        </CardHeader>
        <CardBody>
          {transactions.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : transactions.isError ? (
            <ErrorState
              title="Couldn't load transaction history"
              message={humanizeError(transactions.error)}
              onRetry={transactions.refetch}
            />
          ) : transactions.data?.txs.length ? (
            <TxHistoryTable txs={transactions.data.txs} account={address!} />
          ) : (
            <EmptyState
              icon={<Coins className="size-6" />}
              title="No remittance history found"
              description="When you receive inbound aUSDC transfers, check the faucet or start receiving inflows to build your limit."
            />
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
