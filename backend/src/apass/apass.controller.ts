import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApassService } from './apass.service';

const DEFAULT_CHAIN = 'base';
// A-Pass expires 5 years from generation (arbitrary, generous for a hackathon demo).
const EXPIRATION_SECONDS = 5 * 365 * 24 * 60 * 60;

interface GenerateApassBody {
  address: string;
  chain?: string;
}

@Controller('api/apass')
export class ApassController {
  constructor(private readonly apassService: ApassService) {}

  @Post('generate')
  async generate(@Body() body: GenerateApassBody) {
    const chain = body.chain ?? DEFAULT_CHAIN;
    // No real KYC provider in the MVP (deferred per project brief); derive a
    // deterministic, spec-compliant customerId from the wallet address instead.
    const customerId = `AJOCRED${body.address.replace(/^0x/, '').toUpperCase()}`;

    return this.apassService.generate({
      customerId,
      wallet: { address: body.address, chain },
      expirationTime: Math.floor(Date.now() / 1000) + EXPIRATION_SECONDS,
    });
  }

  @Get(':address')
  async query(
    @Param('address') address: string,
    @Query('chain') chain?: string,
  ) {
    return this.apassService.query(chain ?? DEFAULT_CHAIN, address);
  }
}
