import { useCallback, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { parseToken } from "@/lib/utils";

interface UseAmountInputArgs {
  /** Token decimals for parsing the human string into base units. */
  decimals?: number;
  /** Upper bound in base units (e.g. wallet balance, available liquidity). */
  max?: bigint;
}

/**
 * Controlled amount field state shared by every pool action. Keeps the raw
 * string the user typed, the parsed base-unit bigint, and a validation message.
 * Parsing lives here (not in each page) so the two amount spaces never get mixed
 * up — pages hand us decimals + a base-unit max and get back a base-unit value.
 */
export function useAmountInput({ decimals, max }: UseAmountInputArgs) {
  const [value, setValue] = useState("");

  const { parsed, error } = useMemo(() => {
    const trimmed = value.trim();
    if (trimmed === "") return { parsed: null, error: null };
    if (decimals === undefined) return { parsed: null, error: null };

    // Reject anything that isn't a plain positive decimal before handing it to
    // viem's parseUnits, which throws on malformed input.
    if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") {
      return { parsed: null, error: "Enter a valid amount." };
    }

    let base: bigint;
    try {
      base = parseToken(trimmed, decimals);
    } catch {
      return { parsed: null, error: "Enter a valid amount." };
    }

    if (base <= 0n) return { parsed: null, error: "Amount must be greater than zero." };
    if (max !== undefined && base > max) {
      return { parsed: null, error: "Amount exceeds the available balance." };
    }
    return { parsed: base, error: null };
  }, [value, decimals, max]);

  const setMax = useCallback(() => {
    if (max === undefined || decimals === undefined) return;
    // Show the same human string we'd parse back, so the field round-trips exactly.
    setValue(formatUnits(max, decimals));
  }, [max, decimals]);

  const reset = useCallback(() => setValue(""), []);

  return { value, setValue, parsed, error, setMax, reset };
}
