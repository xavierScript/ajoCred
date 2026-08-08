import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useCallback } from "react";
import { POOL_ADDRESS, AUSDC_ADDRESS, CHAIN, erc20Abi } from "@/lib/contracts";
import type { Address } from "viem";

/**
 * Read aUSDC token decimals. Most stablecoins = 6, but reading on-chain is
 * safer than hardcoding. Cached per wagmi query key.
 */
export function useTokenDecimals() {
  const { data, isLoading, error } = useReadContract({
    address: AUSDC_ADDRESS,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: CHAIN.id,
  });
  return { decimals: data as number | undefined, isLoading, error };
}

/** aUSDC symbol (for display labels). */
export function useTokenSymbol() {
  const { data, isLoading } = useReadContract({
    address: AUSDC_ADDRESS,
    abi: erc20Abi,
    functionName: "symbol",
    chainId: CHAIN.id,
  });
  return { symbol: (data as string | undefined) ?? "aUSDC", isLoading };
}

/** User's aUSDC balance. */
export function useTokenBalance(account?: Address) {
  const { data, isLoading, refetch } = useReadContract({
    address: AUSDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    chainId: CHAIN.id,
    query: { enabled: !!account },
  });
  return { balance: data as bigint | undefined, isLoading, refetch };
}

/** Current allowance the pool has on user's aUSDC. */
export function useTokenAllowance(account?: Address) {
  const { data, isLoading, refetch } = useReadContract({
    address: AUSDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: account ? [account, POOL_ADDRESS] : undefined,
    chainId: CHAIN.id,
    query: { enabled: !!account },
  });
  return { allowance: data as bigint | undefined, isLoading, refetch };
}

/** Approve the pool to spend an amount of aUSDC. */
export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: CHAIN.id,
  });

  const approve = useCallback(
    (amount: bigint) => {
      writeContract({
        address: AUSDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [POOL_ADDRESS, amount],
        chainId: CHAIN.id,
      });
    },
    [writeContract],
  );

  return {
    approve,
    hash,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  };
}
