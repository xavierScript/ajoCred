import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useCallback } from "react";
import type { Address } from "viem";
import { POOL_ADDRESS, CHAIN, poolAbi } from "@/lib/contracts";

export function usePoolPosition(coopId?: bigint, account?: Address) {
  const enabled = coopId !== undefined && !!account;
  const args = enabled ? ([coopId, account] as const) : undefined;

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "deposits", args, chainId: CHAIN.id },
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "borrowings", args, chainId: CHAIN.id },
      { address: POOL_ADDRESS, abi: poolAbi, functionName: "borrowingCaps", args, chainId: CHAIN.id },
    ],
    query: { enabled },
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

export function usePoolAction(fn: PoolWrite) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash, chainId: CHAIN.id });

  const execute = useCallback(
    (coopId: bigint, amount: bigint) => {
      writeContract({
        address: POOL_ADDRESS,
        abi: poolAbi,
        functionName: fn,
        args: [coopId, amount],
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
