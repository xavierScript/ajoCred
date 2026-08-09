import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/admin/admin.guard';

interface FreezeBody {
  userAddress: string;
  chain?: string;
  reason?: string;
}

interface UnfreezeBody {
  userAddress: string;
  chain?: string;
}

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * POST /api/admin/freeze
   * Requires x-admin-key header. Freezes the given wallet's A-Pass on Cleanverse.
   * Body: { userAddress: string, chain?: string, reason?: string }
   */
  @Post('freeze')
  async freeze(@Body() body: FreezeBody) {
    return this.adminService.freeze(
      body.userAddress,
      body.chain ?? 'base',
      body.reason,
    );
  }

  /**
   * POST /api/admin/unfreeze
   * Requires x-admin-key header. Restores the given wallet's A-Pass status.
   * Body: { userAddress: string, chain?: string }
   */
  @Post('unfreeze')
  async unfreeze(@Body() body: UnfreezeBody) {
    return this.adminService.unfreeze(body.userAddress, body.chain ?? 'base');
  }
}
