import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidatorService } from './validator.service';

const DEFAULT_CHAIN = 'base';

interface VerifyBody {
  userAddress: string;
  chain?: string;
}

@Controller('api/validator')
export class ValidatorController {
  constructor(
    private readonly validatorService: ValidatorService,
    private readonly config: ConfigService,
  ) {}

  @Post('verify')
  async verify(@Body() body: VerifyBody) {
    const poolAddress = this.config.get<string>('chain.poolContractAddress');
    if (!poolAddress) {
      throw new Error('POOL_CONTRACT_ADDRESS is not configured');
    }
    return this.validatorService.verify(
      body.chain ?? DEFAULT_CHAIN,
      poolAddress,
      body.userAddress,
    );
  }
}
