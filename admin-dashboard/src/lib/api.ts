import type {
  ApassData,
  Cooperative,
  CooperativeStats,
  DepositAddressResult,
  EligibilityResult,
  FaucetResult,
  QueryTxsResult,
  UserCoopPosition,
  VerifyResult,
  FreezeResult,
  TravelRuleResult,
  RampQuote,
  RampWidget,
  RampOrder,
  RampPaymentMethod,
} from "@/types";

export interface WhitelistEntry {
  chain: string;
  symbol: string;
  assetAddress: string;
  walletAddress: string;
  isActive: boolean;
  createdAt: string;
}

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Can't reach the AjoCred server. Is the backend running?");
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      const m = body?.message ?? body?.error;
      message = Array.isArray(m) ? m.join(", ") : (m ?? message);
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  apass: {
    generate: (address: string, chain = "base") =>
      request("/api/apass/generate", {
        method: "POST",
        body: JSON.stringify({ address, chain }),
      }),
    query: (address: string, chain = "base") =>
      request<ApassData>(`/api/apass/${address}?chain=${chain}`),
  },
  transactions: {
    query: (address: string, chain = "base") =>
      request<QueryTxsResult>(`/api/transactions/${address}?chain=${chain}`),
    travelRule: (txHash: string) =>
      request<TravelRuleResult>(`/api/transactions/travel-rule/${txHash}`, {
        method: "POST",
      }),
  },
  eligibility: {
    get: (address: string, chain = "base") =>
      request<EligibilityResult>(`/api/eligibility/${address}?chain=${chain}`),
  },
  validator: {
    verify: (userAddress: string, chain = "base") =>
      request<VerifyResult>("/api/validator/verify", {
        method: "POST",
        body: JSON.stringify({ userAddress, chain }),
      }),
  },
  cooperatives: {
    list: () => request<Cooperative[]>("/api/cooperatives"),
    get: (id: string) => request<Cooperative>(`/api/cooperatives/${id}`),
    stats: (id: string) =>
      request<CooperativeStats>(`/api/cooperatives/${id}/stats`),
    position: (id: string, address: string) =>
      request<UserCoopPosition>(`/api/cooperatives/${id}/position/${address}`),
    register: (adminAddress: string, maxLiquidity: string, minTier: number) =>
      request<{ txHash: string; coopId: string }>("/api/cooperatives/register", {
        method: "POST",
        headers: { "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ admin: adminAddress, maxLiquidity, minTier }),
      }),
  },
  pool: {
    setCap: (coopId: string, address: string, cap: string) =>
      request<{ txHash: string }>(`/api/pool/${coopId}/set-cap`, {
        method: "POST",
        body: JSON.stringify({ address, cap }),
      }),
  },
  faucet: {
    request: (depositAddress: string, chain = "base", symbol = "ausdc") =>
      request<FaucetResult>("/api/faucet/request", {
        method: "POST",
        body: JSON.stringify({ depositAddress, chain, symbol }),
      }),
    depositAddress: (address: string, chain = "base") =>
      request<DepositAddressResult>(
        `/api/faucet/deposit-address/${address}?chain=${chain}`,
      ),
  },
  admin: {
    freeze: (userAddress: string, reason?: string) =>
      request<FreezeResult>("/api/admin/freeze", {
        method: "POST",
        headers: { "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ userAddress, reason }),
      }),
    unfreeze: (userAddress: string) =>
      request<FreezeResult>("/api/admin/unfreeze", {
        method: "POST",
        headers: { "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ userAddress }),
      }),
    whitelist: {
      getAddresses: (chain = "base") =>
        request<{ entries: WhitelistEntry[] }>(`/api/admin/whitelist/addresses?chain=${chain}`, {
          headers: { "x-admin-key": ADMIN_KEY },
        }),
      add: (walletAddresses: string[], chain = "base") =>
        request<{ success: boolean; entries: WhitelistEntry[] }>("/api/admin/whitelist/add", {
          method: "POST",
          headers: { "x-admin-key": ADMIN_KEY },
          body: JSON.stringify({ walletAddresses, chain }),
        }),
      remove: (walletAddress: string, chain = "base") =>
        request<{ success: boolean; entries: WhitelistEntry[] }>("/api/admin/whitelist/remove", {
          method: "POST",
          headers: { "x-admin-key": ADMIN_KEY },
          body: JSON.stringify({ walletAddress, chain }),
        }),
      restore: (walletAddress: string, chain = "base") =>
        request<{ success: boolean; entries: WhitelistEntry[] }>("/api/admin/whitelist/restore", {
          method: "POST",
          headers: { "x-admin-key": ADMIN_KEY },
          body: JSON.stringify({ walletAddress, chain }),
        }),
    },
  },
  ramp: {
    quote: (params: any) =>
      request<RampQuote>("/api/ramp/quote", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    widget: (quoteToken: string, wallet: any) =>
      request<RampWidget>("/api/ramp/widget", {
        method: "POST",
        body: JSON.stringify({ quoteToken, wallet }),
      }),
    order: (orderId: string) =>
      request<RampOrder>(`/api/ramp/order/${orderId}`),
    paymentMethods: (fiatCurrency = "USD") =>
      request<RampPaymentMethod[]>(`/api/ramp/payment-methods?fiatCurrency=${fiatCurrency}`),
  },
};
