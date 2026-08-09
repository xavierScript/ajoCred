import { useEffect, useRef } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import type { Address } from "viem";
import { ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Stat } from "@/components/ui/Stat";
import { useToast } from "@/components/ui/Toast";
import { useSetCap } from "@/hooks/useBackend";
import { TxStatus } from "./TxStatus";
import { CHAIN } from "@/lib/contracts";
import { formatAmount, formatToken, parseToken, humanizeError } from "@/lib/utils";

interface CapActivationProps {
  account: Address;
  /** The cooperative whose per-member cap is being activated. */
  coopId: string;
  decimals: number;
  symbol: string;
  /** Human-unit borrowing limit from the off-chain risk engine. */
  eligibilityLimit: number;
  /** Current on-chain cap in base units. */
  onChainCap?: bigint;
  /** Refetch the on-chain position after the cap tx confirms. */
  onActivated: () => void;
}

/**
 * Bridges the off-chain eligibility limit to the on-chain borrowing cap. The pool
 * only lets a user borrow up to `borrowingCaps[user]`, which is owner-signed by the
 * backend — so before borrowing, the user asks the backend to write their computed
 * limit on-chain. We wait for that tx to confirm (the backend returns the hash
 * without awaiting the receipt) before refetching the cap.
 */
export function CapActivation({
  account,
  coopId,
  decimals,
  symbol,
  eligibilityLimit,
  onChainCap,
  onActivated,
}: CapActivationProps) {
  const { toast } = useToast();
  const setCap = useSetCap();

  const txHash = setCap.data?.txHash as `0x${string}` | undefined;
  const receipt = useWaitForTransactionReceipt({ hash: txHash, chainId: CHAIN.id });

  // The desired cap in base units — the eligibility limit written to the chain.
  const desiredCap = safeParse(eligibilityLimit, decimals);
  // "Activated" when the on-chain cap already covers the eligibility limit.
  const isActivated =
    onChainCap !== undefined && desiredCap !== null && onChainCap >= desiredCap;

  const activate = () => {
    if (desiredCap === null) return;
    setCap.mutate(
      { coopId, address: account, cap: desiredCap.toString() },
      {
        onError: (err) =>
          toast({ tone: "error", title: "Couldn't activate limit", description: humanizeError(err) }),
      },
    );
  };

  // Once the cap tx confirms on-chain, refetch the position so borrowing unlocks.
  const confirmed = useRef<string | null>(null);
  useEffect(() => {
    if (receipt.isSuccess && txHash && confirmed.current !== txHash) {
      confirmed.current = txHash;
      toast({ tone: "success", title: "Borrowing limit activated", description: "You can now borrow up to your limit." });
      onActivated();
    }
  }, [receipt.isSuccess, txHash, onActivated, toast]);

  const busy = setCap.isPending || receipt.isLoading;

  return (
    <div className="space-y-4 rounded-md border border-border bg-muted/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">On-chain borrowing limit</p>
            <p className="text-xs text-muted-foreground">
              {isActivated
                ? "Your limit is active on-chain."
                : "Activate your limit on-chain before borrowing."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat
          label="Eligible for"
          value={formatAmount(eligibilityLimit)}
          unit={symbol}
        />
        <Stat
          label="Active on-chain"
          value={formatToken(onChainCap, decimals)}
          unit={symbol}
        />
      </div>

      {!isActivated && (
        <Button block onClick={activate} loading={busy} disabled={desiredCap === null}>
          <Zap className="size-4" />
          Activate borrowing limit
        </Button>
      )}

      <TxStatus
        isSubmitting={setCap.isPending}
        isConfirming={receipt.isLoading}
        isSuccess={receipt.isSuccess}
        error={setCap.error ?? receipt.error}
        hash={txHash}
        successLabel="Limit activated"
      />
    </div>
  );
}

function safeParse(human: number, decimals: number): bigint | null {
  if (!Number.isFinite(human) || human <= 0) return null;
  try {
    // Bound to the token's precision so parseUnits never sees excess decimals.
    return parseToken(human.toFixed(decimals), decimals);
  } catch {
    return null;
  }
}
