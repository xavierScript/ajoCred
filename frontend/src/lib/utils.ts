import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatUnits, parseUnits } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Two amount spaces exist in this app, and they must not be mixed:
 *  - On-chain balances (deposits, borrowings, caps, pool stats) are token base
 *    units — bigint (or a stringified bigint from the backend). Use the token's
 *    `decimals` to render them.
 *  - Cleanverse figures (tx amounts, eligibility limits) arrive already in human
 *    units as `number`. Render those with `formatAmount`.
 */

/** Format a token base-unit value (bigint / stringified bigint) to a human string. */
export function formatToken(
  value: bigint | string | undefined,
  decimals: number,
  maxFractionDigits = 2,
): string {
  if (value === undefined) return "—";
  const raw = formatUnits(typeof value === "string" ? BigInt(value) : value, decimals);
  return formatAmount(Number(raw), maxFractionDigits);
}

/** Format an already-human number with grouped thousands and bounded decimals. */
export function formatAmount(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

/** Parse a human-entered amount string into token base units, or throw. */
export function parseToken(value: string, decimals: number): bigint {
  return parseUnits(value as `${number}`, decimals);
}

/** 0x1234…abcd */
export function shortenAddress(address?: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Shorten a tx hash for compact display. */
export function shortenHash(hash?: string, chars = 6): string {
  if (!hash) return "";
  return `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`;
}

/** Unix seconds → "12 Jul 2026". */
export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Turn a raw error (viem/wagmi/fetch) into a short, user-facing sentence.
 * viem errors carry a `shortMessage`; user-rejected txs get a friendly line.
 */
export function humanizeError(err: unknown): string {
  if (!err) return "Something went wrong.";
  const anyErr = err as { shortMessage?: string; message?: string; name?: string };
  const msg = anyErr.shortMessage ?? anyErr.message ?? String(err);

  if (/user rejected|user denied|rejected the request/i.test(msg)) {
    return "Transaction rejected in your wallet.";
  }
  if (/insufficient funds/i.test(msg)) {
    return "Insufficient ETH for gas. Top up Base Sepolia ETH and retry.";
  }
  if (/A-Pass not qualified/i.test(msg)) {
    return "Your wallet isn't compliance-verified for this pool yet. Complete verification first.";
  }
  // Surface the contract's own require() string when present.
  const revert = msg.match(/AjoCred:\s*([^"'\n]+)/i);
  if (revert) return revert[1].trim();

  // Strip noisy multi-line viem detail; keep the first meaningful line.
  return msg.split("\n")[0].slice(0, 200);
}
