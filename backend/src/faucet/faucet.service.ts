import { Injectable } from '@nestjs/common';
import { CleanverseClientService } from '../common/cleanverse/cleanverse-client.service';

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
  // The user sends native USDC here; access_core mints aUSDC 1:1 when the sender
  // is a whitelisted institution.
  depositUSDCWallet: string;
  depositUSDTWallet: string;
  // Empty on EVM chains (Solana only).
  aPassAddress: string;
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

  /**
   * Resolve a wallet's Cleanverse-managed deposit address. Native USDC sent to
   * this address FROM A WHITELISTED INSTITUTION (e.g. Circle's testnet faucet) is
   * locked and re-minted as aUSDC 1:1 to the wallet. USDC from a non-whitelisted
   * sender is forwarded through as plain USDC (not converted). Alternate funding
   * path used when the Cleanverse faucet reservoir is drained.
   */
  async queryDepositAddress(
    chain: string,
    address: string,
  ): Promise<DepositAddressResult> {
    return this.cleanverse.postPlain<DepositAddressResult>(
      '/query_deposit_address',
      { chain, address },
    );
  }
}
