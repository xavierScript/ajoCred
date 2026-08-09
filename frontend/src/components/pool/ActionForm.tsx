import { useEffect, useRef } from "react";
import type { Address } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { usePoolAction } from "@/hooks/usePool";
import { useTokenAllowance, useApproveToken } from "@/hooks/useToken";
import { useAmountInput } from "@/hooks/useAmountInput";
import { humanizeError } from "@/lib/utils";
import { AmountField } from "./AmountField";
import { TxStatus } from "./TxStatus";

type PoolAction = "deposit" | "withdraw" | "borrow" | "repay";

interface ActionFormProps {
  action: PoolAction;
  /** The cooperative this action runs against — every v2 pool write is coop-scoped. */
  coopId: string;
  /** deposit & repay pull tokens from the user, so they need an ERC-20 allowance first. */
  needsApproval: boolean;
  /**
   * Interest fee (basis points) the pool pulls on top of the entered amount. Repay
   * charges the borrower `amount + amount*feeBps/10000`, so the ERC-20 allowance must
   * cover the fee too. Defaults to 0 (deposit pulls exactly the entered amount).
   */
  feeBps?: number;
  account?: Address;
  decimals?: number;
  symbol: string;
  /** Upper bound in base units (balance / deposited / available-to-borrow / debt). */
  max?: bigint;
  maxLabel: string;
  fieldLabel: string;
  submitLabel: string;
  successLabel: string;
  /** Blocks the whole form (e.g. not compliance-verified) with an explanatory note. */
  disabled?: boolean;
  disabledReason?: string;
  /** Refetch balances/position after a confirmed write. */
  onSuccess?: () => void;
}

/**
 * One form for every pool action. Handles the amount field, the optional
 * approve→write two-step for token-pulling actions, transaction status, and
 * post-confirmation refetch. Keeps the four pages free of duplicated tx plumbing.
 */
export function ActionForm({
  action,
  coopId,
  needsApproval,
  feeBps = 0,
  account,
  decimals,
  symbol,
  max,
  maxLabel,
  fieldLabel,
  submitLabel,
  successLabel,
  disabled,
  disabledReason,
  onSuccess,
}: ActionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { value, setValue, parsed, error, setMax, reset } = useAmountInput({ decimals, max });

  const write = usePoolAction(action);
  const allowance = useTokenAllowance(needsApproval ? account : undefined);
  const approve = useApproveToken();

  const pendingAutoActionRef = useRef<bigint | null>(null);

  const hasAmount = parsed !== null && parsed > 0n;

  // The pool pulls `amount + fee` for fee-bearing actions (repay), so the allowance
  // must cover the fee. Rounded up to match the contract's integer division being a
  // floor on its side — approving the ceiling never under-approves.
  const requiredAllowance =
    parsed !== null && feeBps > 0
      ? parsed + (parsed * BigInt(feeBps) + 9999n) / 10000n
      : parsed;

  const needsAllowance =
    needsApproval &&
    hasAmount &&
    requiredAllowance !== null &&
    (allowance.allowance ?? 0n) < requiredAllowance;

  // Refresh allowance once an approval confirms & automatically chain the 2nd contract action
  const approvedHandled = useRef(false);
  useEffect(() => {
    if (approve.isSuccess && !approvedHandled.current) {
      approvedHandled.current = true;
      void queryClient.invalidateQueries();
      void allowance.refetch();

      if (pendingAutoActionRef.current !== null) {
        const amountToExecute = pendingAutoActionRef.current;
        pendingAutoActionRef.current = null;
        toast({
          tone: "success",
          title: "Approval confirmed",
          description: `aUSDC approved! Opening wallet for ${submitLabel}...`,
        });
        write.execute(BigInt(coopId), amountToExecute);
      }
    }
    if (!approve.isSuccess) {
      approvedHandled.current = false;
    }
  }, [approve.isSuccess, allowance, queryClient, coopId, write, submitLabel, toast]);

  // On a confirmed write: notify, clear the field, and let the page refetch.
  const writeHandled = useRef<string | null>(null);
  useEffect(() => {
    if (write.isSuccess && write.hash && writeHandled.current !== write.hash) {
      writeHandled.current = write.hash;
      void queryClient.invalidateQueries();
      toast({ tone: "success", title: `${successLabel} confirmed`, description: "Your position has been updated." });
      reset();
      onSuccess?.();
    }
  }, [write.isSuccess, write.hash, successLabel, reset, onSuccess, queryClient, toast]);

  const submit = () => {
    if (!hasAmount || parsed === null) return;
    if (needsAllowance) {
      pendingAutoActionRef.current = parsed;
      approve.approve(requiredAllowance ?? parsed);
    } else {
      pendingAutoActionRef.current = null;
      write.execute(BigInt(coopId), parsed);
    }
  };

  const busy = write.isSubmitting || write.isConfirming || approve.isPending;
  const canSubmit = !disabled && !busy && hasAmount && !error;

  const buttonText = hasAmount
    ? needsAllowance
      ? `Step 1 of 2: Approve ${symbol}`
      : needsApproval
      ? `Step 2 of 2: ${submitLabel}`
      : submitLabel
    : submitLabel;

  return (
    <div className="space-y-4">
      <AmountField
        label={fieldLabel}
        value={value}
        onChange={setValue}
        onMax={setMax}
        error={error}
        symbol={symbol}
        decimals={decimals}
        max={max}
        maxLabel={maxLabel}
        disabled={disabled || busy}
      />

      <Button
        block
        variant={action === "borrow" ? "accent" : "primary"}
        onClick={submit}
        disabled={!canSubmit}
        loading={busy}
      >
        {buttonText}
      </Button>

      {disabled && disabledReason && (
        <p className="text-center text-sm text-muted-foreground">{disabledReason}</p>
      )}

      {approve.error && !write.error && (
        <p className="text-sm text-destructive">{humanizeError(approve.error)}</p>
      )}

      <TxStatus
        isSubmitting={write.isSubmitting}
        isConfirming={write.isConfirming}
        isSuccess={write.isSuccess}
        error={write.error}
        hash={write.hash}
        successLabel={successLabel}
      />
    </div>
  );
}
