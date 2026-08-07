import { Controller, Get, Param, Query } from '@nestjs/common';
import { EligibilityService } from './eligibility.service';

@Controller('api/eligibility')
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Get(':address')
  async getEligibility(
    @Param('address') address: string,
    @Query('chain') chain?: string,
  ) {
    return this.eligibilityService.calculate(address, chain ?? 'base');
  }
}
