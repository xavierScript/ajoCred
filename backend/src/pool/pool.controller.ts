import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PoolService } from './pool.service';

class SetCapDto {
  address!: string;
  cap!: string;
}

@Controller('api/pool')
export class PoolController {
  constructor(private readonly poolService: PoolService) {}

  @Get('stats')
  async getStats() {
    return this.poolService.getStats();
  }

  @Get('position/:address')
  async getPosition(@Param('address') address: string) {
    return this.poolService.getUserPosition(address as `0x${string}`);
  }

  @Post('set-cap')
  async setCap(@Body() body: SetCapDto) {
    const txHash = await this.poolService.setBorrowingCap(
      body.address as `0x${string}`,
      BigInt(body.cap),
    );
    return { txHash };
  }
}
