// Shared frontend types mirroring backend response shapes (see backend/src/*/*.service.ts).

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

export interface CleanverseTx {
  chain: string;
  symbol: string;
  tx_hash: string;
  from_address: string;
  from_org_name: string;
  to_address: string;
  amount: string;
  fee_amount: string;
  pay_fee_index: number;
  type: string;
  block_number: number;
  block_time: number;
  status: string;
}

export interface QueryTxsResult {
  total_count: number;
  txs: CleanverseTx[];
}

export interface EligibilityBreakdown {
  totalInflow: number;
  uniqueSenders: number;
  inflowTxCount: number;
  averageMonthlyInflow: number;
  lookbackMonths: number;
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

export interface PoolStats {
  totalDeposits: string;
  totalBorrowings: string;
  availableLiquidity: string;
}

export interface UserPoolPosition {
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
  // On EVM chains USDC and USDT share the same deposit wallet (both fields equal).
  depositUSDCWallet: string;
  depositUSDTWallet: string;
  // Empty on EVM chains (Solana only).
  aPassAddress: string;
}
