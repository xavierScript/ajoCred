import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError, WhitelistEntry } from "@/lib/api";
import type {
  ApassData,
  Cooperative,
  CooperativeStats,
  DepositAddressResult,
  EligibilityResult,
  QueryTxsResult,
  UserCoopPosition,
  VerifyResult,
  FaucetResult,
  FreezeResult,
  TravelRuleResult,
  RampQuote,
  RampWidget,
  RampOrder,
  RampPaymentMethod,
} from "@/types";

function retryUnlessClientError(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

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

export function useGenerateApass() {
  return useMutation({
    mutationFn: (address: string) => api.apass.generate(address),
  });
}

export function useTransactions(address?: string) {
  return useQuery<QueryTxsResult, ApiError>({
    queryKey: ["transactions", address],
    queryFn: () => api.transactions.query(address!),
    enabled: !!address,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });
}

export function useTravelRule() {
  return useMutation<TravelRuleResult, ApiError, string>({
    mutationFn: (txHash: string) => api.transactions.travelRule(txHash),
  });
}

export function useEligibility(address?: string) {
  return useQuery<EligibilityResult, ApiError>({
    queryKey: ["eligibility", address],
    queryFn: () => api.eligibility.get(address!),
    enabled: !!address,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });
}

export function useVerify(address?: string) {
  return useQuery<VerifyResult, ApiError>({
    queryKey: ["verify", address],
    queryFn: () => api.validator.verify(address!),
    enabled: !!address,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });
}

export function useFaucet() {
  return useMutation<FaucetResult, ApiError, string>({
    mutationFn: (depositAddress: string) => api.faucet.request(depositAddress),
  });
}

export function useDepositAddress(address?: string) {
  return useQuery<DepositAddressResult, ApiError>({
    queryKey: ["deposit-address", address],
    queryFn: () => api.faucet.depositAddress(address!),
    enabled: false,
    retry: retryUnlessClientError,
    staleTime: Infinity,
  });
}

export function useCooperatives() {
  return useQuery<Cooperative[], ApiError>({
    queryKey: ["cooperatives"],
    queryFn: () => api.cooperatives.list(),
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });
}

export function useCooperative(id?: string) {
  return useQuery<Cooperative, ApiError>({
    queryKey: ["cooperative", id],
    queryFn: () => api.cooperatives.get(id!),
    enabled: !!id,
    retry: retryUnlessClientError,
    staleTime: 30_000,
  });
}

export function useCoopStats(id?: string) {
  return useQuery<CooperativeStats, ApiError>({
    queryKey: ["coop-stats", id],
    queryFn: () => api.cooperatives.stats(id!),
    enabled: !!id,
    retry: retryUnlessClientError,
    staleTime: 15_000,
  });
}

export function useCoopPosition(id?: string, address?: string) {
  return useQuery<UserCoopPosition, ApiError>({
    queryKey: ["coop-position", id, address],
    queryFn: () => api.cooperatives.position(id!, address!),
    enabled: !!id && !!address,
    retry: retryUnlessClientError,
    staleTime: 15_000,
  });
}

export function useRegisterCooperative() {
  return useMutation<
    { txHash: string; coopId: string },
    ApiError,
    { adminAddress: string; maxLiquidity: string; minTier: number }
  >({
    mutationFn: ({ adminAddress, maxLiquidity, minTier }) =>
      api.cooperatives.register(adminAddress, maxLiquidity, minTier),
  });
}

export function useSetCap() {
  return useMutation<
    { txHash: string },
    ApiError,
    { coopId: string; address: string; cap: string }
  >({
    mutationFn: ({ coopId, address, cap }) =>
      api.pool.setCap(coopId, address, cap),
  });
}

export function useFreeze() {
  return useMutation<FreezeResult, ApiError, { address: string; reason?: string }>({
    mutationFn: ({ address, reason }) => api.admin.freeze(address, reason),
  });
}

export function useUnfreeze() {
  return useMutation<FreezeResult, ApiError, string>({
    mutationFn: (address: string) => api.admin.unfreeze(address),
  });
}

export function useWhitelistAddresses(chain = "base") {
  return useQuery<{ entries: WhitelistEntry[] }, ApiError>({
    queryKey: ["whitelist-addresses", chain],
    queryFn: () => api.admin.whitelist.getAddresses(chain),
    retry: retryUnlessClientError,
    staleTime: 15_000,
  });
}

export function useAddWhitelist() {
  return useMutation<
    { success: boolean; entries: WhitelistEntry[] },
    ApiError,
    { walletAddresses: string[]; chain?: string }
  >({
    mutationFn: ({ walletAddresses, chain }) =>
      api.admin.whitelist.add(walletAddresses, chain),
  });
}

export function useRemoveWhitelist() {
  return useMutation<
    { success: boolean; entries: WhitelistEntry[] },
    ApiError,
    { walletAddress: string; chain?: string }
  >({
    mutationFn: ({ walletAddress, chain }) =>
      api.admin.whitelist.remove(walletAddress, chain),
  });
}

export function useRestoreWhitelist() {
  return useMutation<
    { success: boolean; entries: WhitelistEntry[] },
    ApiError,
    { walletAddress: string; chain?: string }
  >({
    mutationFn: ({ walletAddress, chain }) =>
      api.admin.whitelist.restore(walletAddress, chain),
  });
}

export function useRampQuote() {
  return useMutation<RampQuote, ApiError, any>({
    mutationFn: (params: any) => api.ramp.quote(params),
  });
}

export function useRampWidget() {
  return useMutation<RampWidget, ApiError, { quoteToken: string; wallet: any }>({
    mutationFn: ({ quoteToken, wallet }) => api.ramp.widget(quoteToken, wallet),
  });
}

export function useRampOrder(orderId?: string) {
  return useQuery<RampOrder, ApiError>({
    queryKey: ["ramp-order", orderId],
    queryFn: () => api.ramp.order(orderId!),
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "COMPLETED") return false;
      return 5_000;
    },
  });
}

export function useRampPaymentMethods(fiatCurrency = "USD") {
  return useQuery<RampPaymentMethod[], ApiError>({
    queryKey: ["ramp-payment-methods", fiatCurrency],
    queryFn: () => api.ramp.paymentMethods(fiatCurrency),
    staleTime: 300_000,
  });
}
