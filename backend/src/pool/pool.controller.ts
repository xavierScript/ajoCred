import { Body, Controller, Param, Post } from '@nestjs/common';
import { PoolService } from './pool.service';

class SetCapDto {
  address!: string;
  cap!: string;
}

@Controller('api/pool')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  /**
   * POST /api/pool/:coopId/set-cap
   * Owner-signed: writes a borrower's borrowing cap for the given cooperative.
   * Body: { address: string, cap: string (base units) }
   */
  @Post(':coopId/set-cap')
  async setCap(@Param('coopId') coopId: string, @Body() body: SetCapDto) {
    const txHash = await this.poolService.setBorrowingCap(
      BigInt(coopId),
      body.address as `0x${string}`,
      BigInt(body.cap),
    );
    return { txHash };
  }
}
