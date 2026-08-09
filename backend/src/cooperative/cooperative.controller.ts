import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { AdminGuard } from '../common/admin/admin.guard';

class RegisterCooperativeDto {
  admin!: string;
  /** Max liquidity cap in base units (aUSDC, 6 decimals). */
  maxLiquidity!: string;
  minTier!: number;
}

@Controller('api/cooperatives')
export class CooperativeController {
  constructor(private readonly cooperatives: CooperativeService) {}

  /** GET /api/cooperatives — list all registered cooperatives. */
  @Get()
  async list() {
    return this.cooperatives.list();
  }

  /** GET /api/cooperatives/:id — single cooperative record. */
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.cooperatives.get(BigInt(id));
  }

  /** GET /api/cooperatives/:id/stats — per-cooperative liquidity/cap stats. */
  @Get(':id/stats')
  async stats(@Param('id') id: string) {
    return this.cooperatives.stats(BigInt(id));
  }

  /** GET /api/cooperatives/:id/position/:address — a user's position in one coop. */
  @Get(':id/position/:address')
  async position(@Param('id') id: string, @Param('address') address: string) {
    return this.cooperatives.userPosition(BigInt(id), address as `0x${string}`);
  }

  /**
   * POST /api/cooperatives/register — owner-signed cooperative registration.
   * Guarded by AdminGuard (x-admin-key) since it triggers an owner-only on-chain tx.
   */
  @Post('register')
  @UseGuards(AdminGuard)
  async register(@Body() body: RegisterCooperativeDto) {
    return this.cooperatives.register(
      body.admin as `0x${string}`,
      BigInt(body.maxLiquidity),
      Number(body.minTier),
    );
  }
}
