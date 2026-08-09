// Shared types mirroring backend response shapes (see backend/src/*/*.service.ts).

export interface ApassData {
  cvRecordId: string;
  subTier: number;
  status: number;
  tier: string;
  expirationTime: number;
  subGroup: string;
  currentKycHash: string;
  group: string;
  countries: string[];
}

export interface RemittanceTx {
  chain: string;
  symbol: string;
  hash: string;
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
  timestamp: number;
  status: string;
}

export interface QueryTxsResult {
  totalCount: number;
  txs: RemittanceTx[];
}

export interface EligibilityBreakdown {
  totalInflow: number;
  uniqueSenders: number;
  inflowTxCount: number;
  averageMonthlyInflow: number;
  lookbackMonths: number;
  apassTier?: string;
  multiplier?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  borrowingLimit: number;
  breakdown: EligibilityBreakdown;
}

export interface VerifyResult {
  chain: string;
  contract_address: string;
  user_address: string;
  valid: boolean;
}

/** A cooperative's on-chain record (bigints serialized as strings). */
export interface Cooperative {
  id: string;
  admin: string;
  totalLiquidity: string;
  maxLiquidity: string;
  minTier: number;
  active: boolean;
}

/** Per-cooperative liquidity snapshot for the browse/detail views. */
export interface CooperativeStats {
  id: string;
  /** Currently lendable liquidity in the cooperative's pool (base units). */
  totalLiquidity: string;
  maxLiquidity: string;
  /** Room left under the cooperative's ceiling (maxLiquidity − totalLiquidity). */
  availableCapacity: string;
  minTier: number;
  active: boolean;
}

/** A member's position within one cooperative (base units as strings). */
export interface UserCoopPosition {
  coopId: string;
  deposit: string;
  borrowing: string;
  borrowingCap: string;
}

export interface FaucetResult {
  chain: string;
  symbol: string;
  deposit_address: string;
  amount: string;
  tx_hash: string;
}

export interface DepositAddressResult {
  address: string;
  chain: string;
  txHash: string | null;
  depositUSDCWallet: string;
  depositUSDTWallet: string;
  aPassAddress: string;
}

export interface FreezeResult {
  success: boolean;
  userAddress: string;
  status: number;
  txHash?: string;
}

export interface TravelRuleResult {
  /** Token-based, time-limited download link from Cleanverse (`data.downloadUrl`). */
  downloadUrl?: string;
  /** Suggested file name for the report (`data.fileName`). */
  fileName?: string;
}

export interface RampQuote {
  quoteToken: string;
  fiatCurrency: string;
  cryptoCurrency: string;
  fiatAmount: number;
  cryptoAmount: number;
  totalFee: number;
  conversionPrice: number;
}

export interface RampWidget {
  orderId: string;
  widgetUrl: string;
}

export interface RampOrder {
  orderId: string;
  status: string;
  fiatAmount: number;
  cryptoAmount: number;
  buyOrSell: string;
  walletAddress: string;
}

export interface RampPaymentMethod {
  id: string;
  name: string;
  icon?: string;
}
