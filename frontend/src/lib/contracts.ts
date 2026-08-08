import { baseSepolia } from "wagmi/chains";
import poolAbiJson from "@/lib/abi/AjoCredPool.json";
import erc20AbiJson from "@/lib/abi/erc20.json";

// Deployed AjoCred contracts on Base Sepolia (chainId 84532). Sourced from
// VITE_ env vars so the same build can target a re-deploy without a code change;
// the committed .env holds the current testnet addresses.
export const POOL_ADDRESS = import.meta.env
  .VITE_POOL_CONTRACT_ADDRESS as `0x${string}`;
export const AUSDC_ADDRESS = import.meta.env
  .VITE_AUSDC_TOKEN_ADDRESS as `0x${string}`;

export const CHAIN = baseSepolia;
export const EXPLORER_URL = baseSepolia.blockExplorers.default.url;

export const poolAbi = poolAbiJson;
export const erc20Abi = erc20AbiJson;

/** BaseScan links for a tx hash or address. */
export const explorer = {
  tx: (hash: string) => `${EXPLORER_URL}/tx/${hash}`,
  address: (address: string) => `${EXPLORER_URL}/address/${address}`,
};
