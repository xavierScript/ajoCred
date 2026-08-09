import { Injectable } from '@nestjs/common';
import type { Address } from 'viem';
import { ContractClientService } from '../common/contracts/contract-client.service';

/** On-chain Cooperative struct, serialized (bigints as strings). */
export interface Cooperative {
  id: string;
  admin: Address;
  totalLiquidity: string;
  maxLiquidity: string;
  minTier: number;
  active: boolean;
}

export interface CooperativeStats {
  id: string;
  totalLiquidity: string;
  maxLiquidity: string;
  /** maxLiquidity - totalLiquidity: remaining room under the capped-pilot ceiling. */
  availableCapacity: string;
  minTier: number;
  active: boolean;
}

export interface UserCoopPosition {
  coopId: string;
  deposit: string;
  borrowing: string;
  borrowingCap: string;
}

/** Raw struct shape returned by the contract's getCooperative(coopId). */
interface RawCooperative {
  admin: Address;
  totalLiquidity: bigint;
  maxLiquidity: bigint;
  minTier: number;
  active: boolean;
}

@Injectable()
export class CooperativeService {
  constructor(private readonly contract: ContractClientService) {}

  private async readCooperative(coopId: bigint): Promise<RawCooperative> {
    return this.contract.publicClient.readContract({
      address: this.contract.poolAddress,
      abi: this.contract.poolAbi,
      functionName: 'getCooperative',
      args: [coopId],
    }) as Promise<RawCooperative>;
  }

  private serialize(id: bigint, coop: RawCooperative): Cooperative {
    return {
      id: id.toString(),
      admin: coop.admin,
      totalLiquidity: coop.totalLiquidity.toString(),
      maxLiquidity: coop.maxLiquidity.toString(),
      minTier: Number(coop.minTier),
      active: coop.active,
    };
  }

  async count(): Promise<number> {
    const count = (await this.contract.publicClient.readContract({
      address: this.contract.poolAddress,
      abi: this.contract.poolAbi,
      functionName: 'cooperativeCount',
    })) as bigint;
    return Number(count);
  }

  /** Lists every registered cooperative (ids are 1-indexed on-chain). */
  async list(): Promise<Cooperative[]> {
    const total = await this.count();
    if (total === 0) return [];

    const ids = Array.from({ length: total }, (_, i) => BigInt(i + 1));
    const raw = await Promise.all(ids.map((id) => this.readCooperative(id)));
    return raw.map((coop, i) => this.serialize(ids[i], coop));
  }

  async get(coopId: bigint): Promise<Cooperative> {
    const raw = await this.readCooperative(coopId);
    return this.serialize(coopId, raw);
  }

  async stats(coopId: bigint): Promise<CooperativeStats> {
    const coop = await this.readCooperative(coopId);
    const available = coop.maxLiquidity - coop.totalLiquidity;
    return {
      id: coopId.toString(),
      totalLiquidity: coop.totalLiquidity.toString(),
      maxLiquidity: coop.maxLiquidity.toString(),
      availableCapacity: (available > 0n ? available : 0n).toString(),
      minTier: Number(coop.minTier),
      active: coop.active,
    };
  }

  async userPosition(
    coopId: bigint,
    address: Address,
  ): Promise<UserCoopPosition> {
    const [deposit, borrowing, borrowingCap] = await Promise.all([
      this.contract.publicClient.readContract({
        address: this.contract.poolAddress,
        abi: this.contract.poolAbi,
        functionName: 'deposits',
        args: [coopId, address],
      }) as Promise<bigint>,
      this.contract.publicClient.readContract({
        address: this.contract.poolAddress,
        abi: this.contract.poolAbi,
        functionName: 'borrowings',
        args: [coopId, address],
      }) as Promise<bigint>,
      this.contract.publicClient.readContract({
        address: this.contract.poolAddress,
        abi: this.contract.poolAbi,
        functionName: 'borrowingCaps',
        args: [coopId, address],
      }) as Promise<bigint>,
    ]);

    return {
      coopId: coopId.toString(),
      deposit: deposit.toString(),
      borrowing: borrowing.toString(),
      borrowingCap: borrowingCap.toString(),
    };
  }

  /**
   * Owner-signed: registers a new cooperative on-chain, then reads back the new
   * (1-indexed) coopId from cooperativeCount once the tx confirms.
   */
  async register(
    admin: Address,
    maxLiquidity: bigint,
    minTier: number,
  ): Promise<{ txHash: string; coopId: string }> {
    const { request } = await this.contract.publicClient.simulateContract({
      address: this.contract.poolAddress,
      abi: this.contract.poolAbi,
      functionName: 'registerCooperative',
      args: [admin, maxLiquidity, minTier],
      account: this.contract.walletClient.account,
    });

    const txHash = await this.contract.walletClient.writeContract(request);
    await this.contract.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    const coopId = await this.count();
    return { txHash, coopId: coopId.toString() };
  }
}
