import { Injectable } from '@nestjs/common';
import type { Address } from 'viem';
import { ContractClientService } from '../common/contracts/contract-client.service';

@Injectable()
export class PoolService {
  constructor(private readonly contract: ContractClientService) {}

  /**
   * Owner-only: sets a borrower's max borrowing cap within a specific cooperative,
   * after the eligibility engine computes it. Mirrors the on-chain
   * setBorrowingCap(coopId, user, cap).
   */
  async setBorrowingCap(
    coopId: bigint,
    address: Address,
    cap: bigint,
  ): Promise<string> {
    const { request } = await this.contract.publicClient.simulateContract({
      address: this.contract.poolAddress,
      abi: this.contract.poolAbi,
      functionName: 'setBorrowingCap',
      args: [coopId, address, cap],
      account: this.contract.walletClient.account,
    });

    const txHash = await this.contract.walletClient.writeContract(request);
    return txHash;
  }
}
