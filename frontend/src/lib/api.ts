import type {
  ApassData,
  DepositAddressResult,
  EligibilityResult,
  FaucetResult,
  PoolStats,
  QueryTxsResult,
  UserPoolPosition,
  VerifyResult,
} from "@/types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/** Error carrying the backend's HTTP status and parsed message. */
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
    // NestJS errors come back as { statusCode, message, error }; message may be
    // a string or string[]. Fall back to raw text for anything non-JSON.
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
};
