import { Injectable } from '@nestjs/common';
import { CleanverseClientService } from '../common/cleanverse/cleanverse-client.service';

export interface FaucetResult {
  chain: string;
  symbol: string;
  deposit_address: string;
  amount: string;
  tx_hash: string;
}

@Injectable()
export class FaucetService {
  constructor(private readonly cleanverse: CleanverseClientService) {}

  async request(
    chain: string,
    symbol: string,
    depositAddress: string,
    amount: string,
  ): Promise<FaucetResult> {
    return this.cleanverse.postPlain<FaucetResult>('/faucet', {
      chain,
      symbol,
      depositAddress,
      amount,
    });
  }
}
