import { useState } from "react";
import { Droplets, ChevronDown } from "lucide-react";
import type { Address } from "viem";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useFaucet, useDepositAddress } from "@/hooks/useBackend";
import { humanizeError } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Testnet convenience: request sandbox aUSDC so a user can actually deposit/repay
 * on Base Sepolia. Not part of the production lending flow — clearly labeled as such.
 *
 * Two funding paths:
 *  1. Primary — the Cleanverse aUSDC faucet (Request button).
 *  2. Fallback — the wallet's deposit address, fundable from a whitelisted
 *     institution faucet (e.g. Circle). Used when the faucet reservoir is drained.
 */
export function FaucetCard({
  account,
  onFunded,
}: {
  account: Address;
  onFunded?: () => void;
}) {
  const { toast } = useToast();
  const faucet = useFaucet();
  const deposit = useDepositAddress(account);
  const [showDeposit, setShowDeposit] = useState(false);

  const request = async () => {
    try {
      const res = await faucet.mutateAsync(account);
      toast({
        tone: "success",
        title: "Test tokens sent",
        description: `Requested ${res.symbol.toUpperCase()} to your wallet. It may take a moment to arrive.`,
      });
      onFunded?.();
    } catch (err) {
      toast({ tone: "error", title: "Faucet request failed", description: humanizeError(err) });
    }
  };

  const toggleDeposit = () => {
    const next = !showDeposit;
    setShowDeposit(next);
    // Fetch on first expand only; the address is stable so it's cached thereafter.
    if (next && !deposit.data && !deposit.isFetching) {
      void deposit.refetch();
    }
  };

  return (
    <div className="rounded-md border border-border bg-muted/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <Droplets className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Need test aUSDC?</p>
          <p className="text-xs text-muted-foreground">
            Request sandbox tokens to try deposits on Base Sepolia.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={request} loading={faucet.isPending}>
          Request
        </Button>
      </div>

      {/* Fallback funding path — collapsed by default */}
      <div className="mt-3 border-t border-border pt-3">
        <button
          onClick={toggleDeposit}
          aria-expanded={showDeposit}
          className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>Faucet empty? Fund via your deposit address</span>
          <ChevronDown
            className={cn("size-4 transition-transform", showDeposit && "rotate-180")}
          />
        </button>

        {showDeposit && (
          <div className="mt-3 space-y-2">
            {deposit.isFetching ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner className="size-4" />
                Resolving your deposit address…
              </div>
            ) : deposit.error ? (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{humanizeError(deposit.error)}</p>
                <Button size="sm" variant="ghost" onClick={() => void deposit.refetch()}>
                  Retry
                </Button>
              </div>
            ) : deposit.data ? (
              <>
                <div className="flex items-center gap-2 rounded border border-border bg-background px-2.5 py-2">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs">
                    {deposit.data.depositUSDCWallet}
                  </code>
                  <CopyButton value={deposit.data.depositUSDCWallet} label="Copy deposit address" />
                </div>
                <p className="text-xs text-muted-foreground [text-wrap:pretty]">
                  Send Base Sepolia USDC to this address from{" "}
                  <a
                    href="https://faucet.circle.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Circle's faucet
                  </a>
                  . It's minted 1:1 to your wallet as aUSDC. Only works from a whitelisted
                  institution — USDC from other senders arrives as plain USDC.
                </p>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
