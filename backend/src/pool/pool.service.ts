import { Injectable } from '@nestjs/common';
import type { Address } from 'viem';
import { ContractClientService } from '../common/contracts/contract-client.service';

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

@Injectable()
export class PoolService {
  constructor(private readonly contract: ContractClientService) {}

  async getStats(): Promise<PoolStats> {
    const [totalDeposits, totalBorrowings, availableLiquidity] =
      await Promise.all([
        this.contract.publicClient.readContract({
          address: this.contract.poolAddress,
          abi: this.contract.poolAbi,
          functionName: 'totalDeposits',
        }) as Promise<bigint>,
        this.contract.publicClient.readContract({
          address: this.contract.poolAddress,
          abi: this.contract.poolAbi,
          functionName: 'totalBorrowings',
        }) as Promise<bigint>,
        this.contract.publicClient.readContract({
          address: this.contract.poolAddress,
          abi: this.contract.poolAbi,
          functionName: 'availableLiquidity',
        }) as Promise<bigint>,
      ]);

    return {
      totalDeposits: totalDeposits.toString(),
      totalBorrowings: totalBorrowings.toString(),
      availableLiquidity: availableLiquidity.toString(),
    };
  }

  async getUserPosition(address: Address): Promise<UserPoolPosition> {
    const [deposit, borrowing, borrowingCap] = await Promise.all([
      this.contract.publicClient.readContract({
        address: this.contract.poolAddress,
        abi: this.contract.poolAbi,
        functionName: 'deposits',
        args: [address],
      }) as Promise<bigint>,
      this.contract.publicClient.readContract({
        address: this.contract.poolAddress,
        abi: this.contract.poolAbi,
        functionName: 'borrowings',
        args: [address],
      }) as Promise<bigint>,
      this.contract.publicClient.readContract({
        address: this.contract.poolAddress,
        abi: this.contract.poolAbi,
        functionName: 'borrowingCaps',
        args: [address],
      }) as Promise<bigint>,
    ]);

    return {
      deposit: deposit.toString(),
      borrowing: borrowing.toString(),
      borrowingCap: borrowingCap.toString(),
    };
  }

  /** Owner-only: sets a user's max borrowing cap after the eligibility engine computes it. */
  async setBorrowingCap(address: Address, cap: bigint): Promise<string> {
    const { request } = await this.contract.publicClient.simulateContract({
      address: this.contract.poolAddress,
      abi: this.contract.poolAbi,
      functionName: 'setBorrowingCap',
      args: [address, cap],
      account: this.contract.walletClient.account,
    });

    const txHash = await this.contract.walletClient.writeContract(request);
    return txHash;
  }
}
