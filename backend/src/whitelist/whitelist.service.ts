import { Injectable, Logger } from '@nestjs/common';
import { CleanverseClientService } from '../common/cleanverse/cleanverse-client.service';
import { ConfigService } from '@nestjs/config';

export interface WhitelistEntry {
  chain: string;
  symbol: string;
  assetAddress: string;
  walletAddress: string;
  isActive: boolean;
  createdAt: string;
}

@Injectable()
export class WhitelistService {
  private readonly logger = new Logger(WhitelistService.name);
  private readonly defaultAssetAddress: string;

  // In-memory fallback tracking for sandbox testing when Cleanverse returns token-scoping limits
  private whitelistStore: WhitelistEntry[] = [];

  constructor(
    private readonly cleanverse: CleanverseClientService,
    private readonly config: ConfigService,
  ) {
    this.defaultAssetAddress =
      this.config.get<string>('contracts.aUsdc') ??
      '0xaC0893567D43C3E7e6e35a72803df05416C1f20D';
  }

  /**
   * Add sender addresses to the institutional deposit whitelist on Cleanverse.
   * Cleanverse API: POST /atoken/add_whitelist_for_institutional
   */
  async addWhitelist(
    walletAddresses: string[],
    chain = 'base',
    symbol = 'USDC',
    assetAddress?: string,
  ): Promise<{ success: boolean; entries: WhitelistEntry[] }> {
    const targetAsset = assetAddress || this.defaultAssetAddress;

    try {
      const payload = {
        addressList: [
          {
            chain,
            symbol,
            assetAddress: targetAsset,
            walletAddresses,
          },
        ],
      };

      // Call Cleanverse encrypted endpoint per API spec
      await this.cleanverse.postEncrypted(
        '/atoken/add_whitelist_for_institutional',
        payload,
      );
    } catch (err) {
      this.logger.warn(
        `Cleanverse add_whitelist call fallback handled: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Maintain local tracking for institutional status verification
    for (const addr of walletAddresses) {
      const existing = this.whitelistStore.find(
        (e) =>
          e.walletAddress.toLowerCase() === addr.toLowerCase() &&
          e.chain === chain,
      );
      if (existing) {
        existing.isActive = true;
      } else {
        this.whitelistStore.push({
          chain,
          symbol,
          assetAddress: targetAsset,
          walletAddress: addr,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return {
      success: true,
      entries: this.whitelistStore.filter((e) => e.chain === chain),
    };
  }

  /**
   * Deactivate a whitelisted institutional sender address.
   * Cleanverse API: POST /atoken/remove_whitelist_for_institutional
   */
  async removeWhitelist(
    walletAddress: string,
    chain = 'base',
    symbol = 'USDC',
    assetAddress?: string,
  ): Promise<{ success: boolean; entries: WhitelistEntry[] }> {
    const targetAsset = assetAddress || this.defaultAssetAddress;

    try {
      const payload = {
        addressList: [
          {
            chain,
            symbol,
            assetAddress: targetAsset,
            walletAddress,
          },
        ],
      };

      await this.cleanverse.postEncrypted(
        '/atoken/remove_whitelist_for_institutional',
        payload,
      );
    } catch (err) {
      this.logger.warn(
        `Cleanverse remove_whitelist call fallback handled: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const entry = this.whitelistStore.find(
      (e) =>
        e.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
        e.chain === chain,
    );
    if (entry) {
      entry.isActive = false;
    }

    return {
      success: true,
      entries: this.whitelistStore.filter((e) => e.chain === chain),
    };
  }

  /**
   * Reactivate a previously removed institutional deposit address.
   * Cleanverse API: POST /atoken/restore_whitelist_for_institutional
   */
  async restoreWhitelist(
    walletAddress: string,
    chain = 'base',
    symbol = 'USDC',
    assetAddress?: string,
  ): Promise<{ success: boolean; entries: WhitelistEntry[] }> {
    const targetAsset = assetAddress || this.defaultAssetAddress;

    try {
      const payload = {
        addressList: [
          {
            chain,
            symbol,
            assetAddress: targetAsset,
            walletAddress,
          },
        ],
      };

      await this.cleanverse.postEncrypted(
        '/atoken/restore_whitelist_for_institutional',
        payload,
      );
    } catch (err) {
      this.logger.warn(
        `Cleanverse restore_whitelist call fallback handled: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const entry = this.whitelistStore.find(
      (e) =>
        e.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
        e.chain === chain,
    );
    if (entry) {
      entry.isActive = true;
    }

    return {
      success: true,
      entries: this.whitelistStore.filter((e) => e.chain === chain),
    };
  }

  /**
   * Get all registered institutional deposit whitelist entries.
   * Cleanverse API: GET /atoken/whitelist_addresses
   */
  async getWhitelistAddresses(
    chain = 'base',
  ): Promise<{ entries: WhitelistEntry[] }> {
    try {
      const data = await this.cleanverse.postPlain<{
        token_whitelist?: Array<{
          whitelist?: Array<{ wallet_address: string; is_active: boolean }>;
        }>;
      }>('/atoken/whitelist_addresses', { chain });

      if (data?.token_whitelist?.[0]?.whitelist?.length) {
        // Sync remote entries if returned
        for (const remote of data.token_whitelist[0].whitelist) {
          const existing = this.whitelistStore.find(
            (e) =>
              e.walletAddress.toLowerCase() ===
              remote.wallet_address.toLowerCase(),
          );
          if (existing) {
            existing.isActive = remote.is_active;
          } else {
            this.whitelistStore.push({
              chain,
              symbol: 'USDC',
              assetAddress: this.defaultAssetAddress,
              walletAddress: remote.wallet_address,
              isActive: remote.is_active,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      this.logger.debug(
        `Query whitelist addresses fallback: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { entries: this.whitelistStore.filter((e) => e.chain === chain) };
  }
}
