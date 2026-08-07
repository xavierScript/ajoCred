import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type HttpTransport,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import ajoCredPoolAbi from './abis/AjoCredPool.json';

/**
 * Central viem client for reading/writing the deployed AjoCredPool contract on Base Sepolia.
 * PublicClient handles reads (getPoolStats, borrowingCaps, etc.); WalletClient signs
 * owner-only writes (setBorrowingCap) using the pool owner's private key.
 */
@Injectable()
export class ContractClientService {
  readonly publicClient: PublicClient<HttpTransport, typeof baseSepolia>;
  readonly walletClient: WalletClient<
    HttpTransport,
    typeof baseSepolia,
    PrivateKeyAccount
  >;
  readonly poolAddress: Address;
  readonly poolAbi = ajoCredPoolAbi;

  constructor(private readonly config: ConfigService) {
    const rpcUrl = this.config.get<string>('chain.rpcUrl');
    const privateKey = this.config.get<string>('chain.poolOwnerPrivateKey');
    const poolAddress = this.config.get<string>('chain.poolContractAddress');

    if (!rpcUrl || !privateKey || !poolAddress) {
      throw new Error(
        'Missing BASE_SEPOLIA_RPC_URL, POOL_OWNER_PRIVATE_KEY, or POOL_CONTRACT_ADDRESS configuration',
      );
    }

    this.poolAddress = poolAddress as Address;

    const account = privateKeyToAccount(
      (privateKey.startsWith('0x')
        ? privateKey
        : `0x${privateKey}`) as `0x${string}`,
    );

    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    this.walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
  }
}
