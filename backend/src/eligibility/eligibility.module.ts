import { Module } from '@nestjs/common';
import { ApassModule } from '../apass/apass.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from './eligibility.service';

@Module({
  imports: [TransactionsModule, ApassModule],
  controllers: [EligibilityController],
  providers: [EligibilityService],
  exports: [EligibilityService],
})
export class EligibilityModule {}
