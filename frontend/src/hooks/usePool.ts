import { useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useCallback } from "react";
import type { Address } from "viem";
import { POOL_ADDRESS, CHAIN, poolAbi } from "@/lib/contracts";

/**
 * On-chain pool totals: [totalDeposits, totalBorrowings, availableLiquidity]
 * as token base-unit bigints. Read directly from the contract so the dashboard
 * reflects chain truth (the backend /pool/stats reads the same values).
 */
export function usePoolStats() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: POOL_ADDRESS,
    abi: poolAbi,
    functionName: "getPoolStats",
    chainId: CHAIN.id,
  });
  const [totalDeposits, totalBorrowings, availableLiquidity] =
    (data as [bigint, bigint, bigint] | undefined) ?? [];
  return {
    totalDeposits,
    totalBorrowings,
    availableLiquidity,
    isLoading,
    error,
    refetch,
  };
}

/**
 * A wallet's on-chain position: deposit balance, outstanding borrowing, and
 * owner-set borrowing cap. Batched into one multicall.
 */
export function usePoolPosition(account?: Address) {
  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "deposits", args: account ? [account] : undefined, chainId: CHAIN.id },
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "borrowings", args: account ? [account] : undefined, chainId: CHAIN.id },
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "borrowingCaps", args: account ? [account] : undefined, chainId: CHAIN.id },
    ],
    query: { enabled: !!account },
  });

  return {
    deposit: data?.[0]?.result as bigint | undefined,
    borrowing: data?.[1]?.result as bigint | undefined,
    borrowingCap: data?.[2]?.result as bigint | undefined,
    isLoading,
    error,
    refetch,
  };
}

type PoolWrite = "deposit" | "withdraw" | "borrow" | "repay";

/**
 * Generic single-amount pool write (deposit/withdraw/borrow/repay), wrapping
 * wagmi's write + receipt wait so callers get one status surface.
 */
export function usePoolAction(fn: PoolWrite) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash, chainId: CHAIN.id });

  const execute = useCallback(
    (amount: bigint) => {
      writeContract({
        address: POOL_ADDRESS,
        abi: poolAbi,
        functionName: fn,
        args: [amount],
        chainId: CHAIN.id,
      });
    },
    [writeContract, fn],
  );

  return {
    execute,
    hash,
    isSubmitting: isPending,
    isConfirming,
    isSuccess,
    error: error ?? receiptError,
    reset,
  };
}
