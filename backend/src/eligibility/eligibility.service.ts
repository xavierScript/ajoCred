import { Injectable } from '@nestjs/common';
import {
  TransactionsService,
  type CleanverseTx,
} from '../transactions/transactions.service';
import { ApassService } from '../apass/apass.service';

const LOOKBACK_MONTHS = 6;
const LOOKBACK_SECONDS = LOOKBACK_MONTHS * 30 * 24 * 60 * 60;
const AVG_MONTHLY_MULTIPLIER = 0.3;
const TOTAL_INFLOW_CAP_MULTIPLIER = 0.15;

/**
 * Tier -> multiplier table.
 * Cleanverse returns tier as a numeric string from query_apass.
 * Reference: docs/cleanverse-api-reference.md query_apass response, tier field.
 * Multiplier is a named factor on top of the base risk formula.
 * If the sandbox only returns tier 0, mechanism still ships correctly.
 */
const TIER_MULTIPLIERS: Array<{ minTier: number; multiplier: number }> = [
  { minTier: 30, multiplier: 1.5 },
  { minTier: 20, multiplier: 1.3 },
  { minTier: 10, multiplier: 1.15 },
  { minTier: 1, multiplier: 1.1 },
  { minTier: 0, multiplier: 1.0 },
];

function tierMultiplierFor(tier: number): number {
  for (const row of TIER_MULTIPLIERS) {
    if (tier >= row.minTier) return row.multiplier;
  }
  return 1.0;
}

export interface EligibilityBreakdown {
  totalInflow: number;
  uniqueSenders: number;
  inflowTxCount: number;
  averageMonthlyInflow: number;
  lookbackMonths: number;
  /** Numeric A-Pass tier (0 when wallet has no A-Pass or query fails). */
  tier: number;
  /** Multiplier applied to the base borrowingLimit from the tier table. */
  tierMultiplier: number;
}

export interface EligibilityResult {
  eligible: boolean;
  borrowingLimit: number;
  breakdown: EligibilityBreakdown;
}

/**
 * Risk engine: turns a wallet's verified inbound remittance history into a conservative
 * collateral-free borrowing limit, scaled by the wallet's Cleanverse A-Pass tier (CVI dual use).
 * TX data: query_txs. Tier: query_apass. Both from docs/cleanverse-api-reference.md.
 */
@Injectable()
export class EligibilityService {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly apass: ApassService,
  ) {}

  async calculate(address: string, chain = 'base'): Promise<EligibilityResult> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const startTime = nowSeconds - LOOKBACK_SECONDS;

    // Run both Cleanverse calls concurrently -- they are independent.
    // A-Pass failure falls back to tier 0 / 1.0x. Never throws.
    const [txResult, apassResult] = await Promise.allSettled([
      this.transactions.query({
        chain,
        address,
        startTime,
        endTime: nowSeconds,
        page: 1,
        pageSize: 100,
      }),
      this.apass.query(chain, address),
    ]);

    const txQueryResult: { txs: CleanverseTx[]; total_count: number } =
      txResult.status === 'fulfilled'
        ? txResult.value
        : { txs: [], total_count: 0 };
    const { txs } = txQueryResult;

    const apassData =
      apassResult.status === 'fulfilled' ? apassResult.value : null;

    // Parse tier -- Cleanverse returns it as a numeric string.
    const tierRaw = apassData ? parseInt(String(apassData.tier ?? '0'), 10) : 0;
    const tier = isNaN(tierRaw) ? 0 : tierRaw;
    const tierMultiplier = tierMultiplierFor(tier);

    const inboundTxs = (txs as CleanverseTx[]).filter(
      (tx: CleanverseTx) =>
        tx.to_address.toLowerCase() === address.toLowerCase() &&
        tx.status === 'success',
    );

    const totalInflow = inboundTxs.reduce(
      (sum, tx) => sum + Number(tx.amount),
      0,
    );
    const uniqueSenders = new Set(
      inboundTxs.map((tx) => tx.from_address.toLowerCase()),
    ).size;
    const averageMonthlyInflow = totalInflow / LOOKBACK_MONTHS;

    const baseLimit = Math.min(
      averageMonthlyInflow * AVG_MONTHLY_MULTIPLIER,
      totalInflow * TOTAL_INFLOW_CAP_MULTIPLIER,
    );

    const borrowingLimit = baseLimit * tierMultiplier;

    return {
      eligible: inboundTxs.length > 0 && borrowingLimit > 0,
      borrowingLimit,
      breakdown: {
        totalInflow,
        uniqueSenders,
        inflowTxCount: inboundTxs.length,
        averageMonthlyInflow,
        lookbackMonths: LOOKBACK_MONTHS,
        tier,
        tierMultiplier,
      },
    };
  }
}
