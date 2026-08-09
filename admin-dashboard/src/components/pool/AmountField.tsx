import { Input } from "@/components/ui/Input";
import { formatToken } from "@/lib/utils";

interface AmountFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onMax: () => void;
  error?: string | null;
  symbol: string;
  decimals?: number;
  /** Upper-bound in base units, shown as an "available" line beneath the field. */
  max?: bigint;
  maxLabel: string;
  disabled?: boolean;
}

/**
 * Amount entry shared by every pool action: a numeric field with the token
 * symbol, an inline MAX button, and an "available" readout. Purely presentational
 * — parsing/validation live in useAmountInput so this stays reusable.
 */
export function AmountField({
  label,
  value,
  onChange,
  onMax,
  error,
  symbol,
  decimals,
  max,
  maxLabel,
  disabled,
}: AmountFieldProps) {
  return (
    <div className="space-y-1.5">
      <Input
        label={label}
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error ?? undefined}
        disabled={disabled}
        suffix={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMax}
              disabled={disabled || max === undefined || max === 0n}
              className="rounded px-1.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-40"
            >
              MAX
            </button>
            <span className="text-sm font-medium text-muted-foreground">{symbol}</span>
          </div>
        }
      />
      <p className="flex justify-between text-xs text-muted-foreground">
        <span>{maxLabel}</span>
        <span className="font-mono tabular-nums">
          {decimals !== undefined ? formatToken(max, decimals) : "—"} {symbol}
        </span>
      </p>
    </div>
  );
}
