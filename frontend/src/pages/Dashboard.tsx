import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { Wallet, History, Coins, CreditCard, ShieldAlert } from "lucide-react";
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
import { ReceiveMoney } from "@/components/dashboard/ReceiveMoney";
import { SelectCoopPrompt } from "@/components/SelectCoopPrompt";
import { usePoolPosition } from "@/hooks/usePool";
import { useTokenDecimals, useTokenSymbol, useTokenBalance } from "@/hooks/useToken";
import { useEligibility, useTransactions, useVerify } from "@/hooks/useBackend";
import { useSelectedCoop } from "@/hooks/useSelectedCoop";
import { formatToken, shortenAddress, humanizeError } from "@/lib/utils";

export function DashboardPage() {
  const { address } = useAccount();
  const { coopId } = useSelectedCoop();

  const { decimals } = useTokenDecimals();
  const { symbol } = useTokenSymbol();
  const { balance, isLoading: balanceLoading } = useTokenBalance(address);

  const position = usePoolPosition(coopId ? BigInt(coopId) : undefined, address);
  const verify = useVerify(address);
  const eligibility = useEligibility(address);
  const transactions = useTransactions(address);

  const dec = decimals as number | undefined;

  if (!coopId) {
    return (
      <SelectCoopPrompt
        title="Your dashboard"
        description="Your balance, credit limit, and history are tied to a cooperative. Join one to get started."
      />
    );
  }

  const isUnverified = !verify.isLoading && verify.data && !verify.data.valid;

  return (
    <Page>
      <PageHeader
        eyebrow="Dashboard"
        title="Your account"
        description="The money you've received, your savings in the cooperative, and the credit available to you."
        actions={
          <div className="flex items-center gap-3">
            <ComplianceBadge valid={verify.data?.valid} isLoading={verify.isLoading} />
            <Button asChild variant="outline" size="sm">
              <Link to="/ramp">
                <CreditCard className="size-3.5" />
                Withdraw to Bank
              </Link>
            </Button>
          </div>
        }
      />

      {/* Prominent Verification Alert Banner if unverified */}
      {isUnverified && (
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm">Identity Verification Required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your wallet is signed in but not yet verified with Cleanverse A-Pass. Complete a 1-click verification to unlock credit eligibility.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/onboard">Verify Identity Now →</Link>
          </Button>
        </div>
      )}

      {/* Account address strip */}
      {address && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">
          <Wallet className="size-4 text-muted-foreground" />
          <span className="font-mono">{shortenAddress(address)}</span>
          <CopyButton value={address} />
        </div>
      )}

      {/* Demo Controls -- hidden unless VITE_ADMIN_KEY is set */}
      {address && <DemoControls address={address} />}

      {/* Receive money — QR + address for inbound transfers */}
      {address && (
        <div className="mb-6">
          <ReceiveMoney address={address} />
        </div>
      )}

      {/* Top stat ridge */}
      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <Stat
              label="Available balance"
              value={
                balanceLoading || dec === undefined
                  ? undefined
                  : formatToken(balance, dec)
              }
              unit={symbol ?? "USD"}
            />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat
              label="Saved in cooperative"
              value={
                position.isLoading || dec === undefined
                  ? undefined
                  : formatToken(position.deposit, dec)
              }
              unit={symbol ?? "USD"}
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
              unit={symbol ?? "USD"}
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
            title="Couldn't load credit eligibility"
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
            Money you've received
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
              title="No money received yet"
              description="Once you start receiving money from family and friends, it shows up here and builds your credit limit."
            />
          )}
        </CardBody>
      </Card>
    </Page>
  );
}
