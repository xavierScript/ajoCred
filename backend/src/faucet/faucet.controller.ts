import { Body, Controller, Post } from '@nestjs/common';
import { FaucetService } from './faucet.service';

const DEFAULT_CHAIN = 'base';
// Empirically confirmed against the live sandbox (Aug 2026): symbol="usdc" succeeds
// and returns a real tx_hash. symbol="ausdc" consistently reverts with a NoAPass
// error regardless of the depositAddress used, seemingly a sandbox-side faucet
// wiring issue on Cleanverse's end. Defaulting to "usdc" per this finding.
const DEFAULT_SYMBOL = 'usdc';
const MAX_AMOUNT = 5;

interface FaucetRequestBody {
  depositAddress: string;
  amount?: string;
  chain?: string;
  symbol?: string;
}

@Controller('api/faucet')
export class FaucetController {
  constructor(private readonly faucetService: FaucetService) {}

  @Post('request')
  async request(@Body() body: FaucetRequestBody) {
    const amount = Math.min(
      Number(body.amount ?? MAX_AMOUNT),
      MAX_AMOUNT,
    ).toString();
    return this.faucetService.request(
      body.chain ?? DEFAULT_CHAIN,
      body.symbol ?? DEFAULT_SYMBOL,
      body.depositAddress,
      amount,
    );
  }
}
