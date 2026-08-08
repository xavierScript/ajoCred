import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type {
  ApassData,
  DepositAddressResult,
  EligibilityResult,
  QueryTxsResult,
  VerifyResult,
  FaucetResult,
} from "@/types";

// A wallet with no A-Pass / no history returns a 400 from the backend (Cleanverse
// "not found"). That's an expected business state, not a transient failure — don't
// retry it. Retry only network/5xx blips.
function retryUnlessClientError(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

/** A-Pass status for a wallet. `notFound` distinguishes "no pass yet" from a real error. */
export function useApass(address?: string) {
  const query = useQuery<ApassData, ApiError>({
    queryKey: ["apass", address],
    queryFn: () => api.apass.query(address!),
    enabled: !!address,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });

  const notFound = query.error?.status === 400;
  return { ...query, notFound };
}

/** Generate an A-Pass (one-time identity verification) for a wallet. */
export function useGenerateApass() {
  return useMutation({
    mutationFn: (address: string) => api.apass.generate(address),
  });
}

/** Verified inbound remittance history. */
export function useTransactions(address?: string) {
  return useQuery<QueryTxsResult, ApiError>({
    queryKey: ["transactions", address],
    queryFn: () => api.transactions.query(address!),
    enabled: !!address,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });
}

/** Off-chain borrowing-limit calculation (risk engine). */
export function useEligibility(address?: string) {
  return useQuery<EligibilityResult, ApiError>({
    queryKey: ["eligibility", address],
    queryFn: () => api.eligibility.get(address!),
    enabled: !!address,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });
}

/** Off-chain compliance pre-check (UI hint mirroring on-chain complianceVerify). */
export function useVerify(address?: string) {
  return useQuery<VerifyResult, ApiError>({
    queryKey: ["verify", address],
    queryFn: () => api.validator.verify(address!),
    enabled: !!address,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });
}

/** Request sandbox test tokens to a wallet. */
export function useFaucet() {
  return useMutation<FaucetResult, ApiError, string>({
    mutationFn: (depositAddress: string) => api.faucet.request(depositAddress),
  });
}

/**
 * Lazily resolve the wallet's Cleanverse deposit address (fetched on demand, not
 * on mount — `enabled: false`, trigger with `refetch()`). Used for the alternate
 * "fund from Circle's faucet" path when the aUSDC faucet reservoir is empty.
 */
export function useDepositAddress(address?: string) {
  return useQuery<DepositAddressResult, ApiError>({
    queryKey: ["deposit-address", address],
    queryFn: () => api.faucet.depositAddress(address!),
    enabled: false,
    retry: retryUnlessClientError,
    staleTime: Infinity,
  });
}

/**
 * Owner-signed on-chain borrowing-cap write (backend holds the pool owner key).
 * `cap` is a stringified token base-unit bigint, matching the contract's uint256.
 * The borrow flow calls this after eligibility so the on-chain cap reflects the
 * off-chain risk calculation before the user draws funds.
 */
export function useSetCap() {
  return useMutation<{ txHash: string }, ApiError, { address: string; cap: string }>({
    mutationFn: ({ address, cap }) => api.pool.setCap(address, cap),
  });
}
