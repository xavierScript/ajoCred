import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { FaucetService } from './faucet.service';

const DEFAULT_CHAIN = 'base';
// The pool's lendingToken is aUSDC, and the dashboard reads the aUSDC balance —
// so the faucet MUST deliver "ausdc", not "usdc". Cleanverse's aUSDC faucet reverts
// with a NoAPass error unless the depositAddress already holds an A-Pass (confirmed
// via Cleanverse's own guidance). Earlier "ausdc" failures were pre-A-Pass wallets,
// not a faucet fault. Onboarding generates the A-Pass, so by the time a user reaches
// the deposit page this succeeds. (symbol="usdc" mints a different token the pool
// cannot use — it shows in the wallet but not in the app's aUSDC balance.)
const DEFAULT_SYMBOL = 'ausdc';
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

  // Alternate funding path: resolve the wallet's deposit address so the user can
  // fund it from a whitelisted institution faucet (e.g. Circle) when the Cleanverse
  // aUSDC faucet reservoir is empty.
  @Get('deposit-address/:address')
  async depositAddress(
    @Param('address') address: string,
    @Query('chain') chain?: string,
  ) {
    return this.faucetService.queryDepositAddress(
      chain ?? DEFAULT_CHAIN,
      address,
    );
  }
}
