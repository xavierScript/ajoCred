import { useCallback, useMemo, useState } from "react";
import { formatUnits } from "viem";
import { parseToken } from "@/lib/utils";

interface UseAmountInputArgs {
  decimals?: number;
  max?: bigint;
}

export function useAmountInput({ decimals, max }: UseAmountInputArgs) {
  const [value, setValue] = useState("");

  const { parsed, error } = useMemo(() => {
    const trimmed = value.trim();
    if (trimmed === "") return { parsed: null, error: null };
    if (decimals === undefined) return { parsed: null, error: null };

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
    setValue(formatUnits(max, decimals));
  }, [max, decimals]);

  const reset = useCallback(() => setValue(""), []);

  return { value, setValue, parsed, error, setMax, reset };
}
