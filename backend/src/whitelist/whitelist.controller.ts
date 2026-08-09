import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { WhitelistService } from './whitelist.service';
import { AdminGuard } from '../common/admin/admin.guard';

interface AddWhitelistBody {
  walletAddresses: string[];
  chain?: string;
  symbol?: string;
  assetAddress?: string;
}

interface UpdateWhitelistBody {
  walletAddress: string;
  chain?: string;
  symbol?: string;
  assetAddress?: string;
}

@Controller('api/admin/whitelist')
@UseGuards(AdminGuard)
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

  /**
   * POST /api/admin/whitelist/add
   * Requires x-admin-key header. Adds institutional deposit sender addresses.
   * Body: { walletAddresses: string[], chain?: string, symbol?: string, assetAddress?: string }
   */
  @Post('add')
  async addWhitelist(@Body() body: AddWhitelistBody) {
    return this.whitelistService.addWhitelist(
      body.walletAddresses,
      body.chain ?? 'base',
      body.symbol ?? 'USDC',
      body.assetAddress,
    );
  }

  /**
   * POST /api/admin/whitelist/remove
   * Requires x-admin-key header. Deactivates a whitelisted institutional sender address.
   * Body: { walletAddress: string, chain?: string, symbol?: string, assetAddress?: string }
   */
  @Post('remove')
  async removeWhitelist(@Body() body: UpdateWhitelistBody) {
    return this.whitelistService.removeWhitelist(
      body.walletAddress,
      body.chain ?? 'base',
      body.symbol ?? 'USDC',
      body.assetAddress,
    );
  }

  /**
   * POST /api/admin/whitelist/restore
   * Requires x-admin-key header. Reactivates a previously removed whitelisted address.
   * Body: { walletAddress: string, chain?: string, symbol?: string, assetAddress?: string }
   */
  @Post('restore')
  async restoreWhitelist(@Body() body: UpdateWhitelistBody) {
    return this.whitelistService.restoreWhitelist(
      body.walletAddress,
      body.chain ?? 'base',
      body.symbol ?? 'USDC',
      body.assetAddress,
    );
  }

  /**
   * GET /api/admin/whitelist/addresses
   * Requires x-admin-key header. Returns all institutional whitelist entries.
   */
  @Get('addresses')
  async getWhitelistAddresses(@Query('chain') chain?: string) {
    return this.whitelistService.getWhitelistAddresses(chain ?? 'base');
  }
}
