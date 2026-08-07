import type {
  ApassData,
  EligibilityResult,
  FaucetResult,
  PoolStats,
  QueryTxsResult,
  UserPoolPosition,
  VerifyResult,
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
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
  pool: {
    stats: () => request<PoolStats>("/api/pool/stats"),
    position: (address: string) =>
      request<UserPoolPosition>(`/api/pool/position/${address}`),
    setCap: (address: string, cap: string) =>
      request<{ txHash: string }>("/api/pool/set-cap", {
        method: "POST",
        body: JSON.stringify({ address, cap }),
      }),
  },
  faucet: {
    request: (depositAddress: string, chain = "base", symbol = "usdc") =>
      request<FaucetResult>("/api/faucet/request", {
        method: "POST",
        body: JSON.stringify({ depositAddress, chain, symbol }),
      }),
  },
};
