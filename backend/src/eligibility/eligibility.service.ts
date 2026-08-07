import { Injectable } from '@nestjs/common';
import {
  TransactionsService,
  type CleanverseTx,
} from '../transactions/transactions.service';

const LOOKBACK_MONTHS = 6;
const LOOKBACK_SECONDS = LOOKBACK_MONTHS * 30 * 24 * 60 * 60;
const AVG_MONTHLY_MULTIPLIER = 0.3;
const TOTAL_INFLOW_CAP_MULTIPLIER = 0.15;

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

/**
 * Risk engine: turns a wallet's verified inbound remittance history into a conservative
 * collateral-free borrowing limit. Deliberately simple/explainable for the hackathon MVP —
 * see docs/implementation_plan.md "Plan 2: Backend" for the formula rationale.
 */
@Injectable()
export class EligibilityService {
  constructor(private readonly transactions: TransactionsService) {}

  async calculate(address: string, chain = 'base'): Promise<EligibilityResult> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const startTime = nowSeconds - LOOKBACK_SECONDS;

    const { txs } = await this.transactions.query({
      chain,
      address,
      startTime,
      endTime: nowSeconds,
      page: 1,
      pageSize: 100,
    });

    const inboundTxs = txs.filter(
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

    const borrowingLimit = Math.min(
      averageMonthlyInflow * AVG_MONTHLY_MULTIPLIER,
      totalInflow * TOTAL_INFLOW_CAP_MULTIPLIER,
    );

    return {
      eligible: inboundTxs.length > 0 && borrowingLimit > 0,
      borrowingLimit,
      breakdown: {
        totalInflow,
        uniqueSenders,
        inflowTxCount: inboundTxs.length,
        averageMonthlyInflow,
        lookbackMonths: LOOKBACK_MONTHS,
      },
    };
  }
}
