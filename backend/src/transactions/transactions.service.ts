import { Injectable } from '@nestjs/common';
import { CleanverseClientService } from '../common/cleanverse/cleanverse-client.service';

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

interface QueryTxsParams {
  chain: string;
  address: string;
  symbol?: string;
  startTime?: number;
  endTime?: number;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly cleanverse: CleanverseClientService) {}

  async query(params: QueryTxsParams): Promise<QueryTxsResult> {
    const result = await this.cleanverse.postPlain<QueryTxsResult>(
      '/query_txs',
      params,
    );
    // Cleanverse returns `txs: null` (not []) for wallets with no history, which
    // violates the declared CleanverseTx[] type and crashes any consumer that
    // iterates (eligibility filter) or reads .length (frontend). Normalize here
    // so the contract holds for every caller.
    return {
      total_count: result.total_count ?? 0,
      txs: result.txs ?? [],
    };
  }
}
