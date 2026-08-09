import { Module } from '@nestjs/common';
import { ContractsModule } from '../common/contracts/contracts.module';
import { CooperativeController } from './cooperative.controller';
import { CooperativeService } from './cooperative.service';

@Module({
  imports: [ContractsModule],
  controllers: [CooperativeController],
  providers: [CooperativeService],
  exports: [CooperativeService],
})
export class CooperativeModule {}
