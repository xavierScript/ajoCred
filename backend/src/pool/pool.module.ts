import { Module } from '@nestjs/common';
import { ContractsModule } from '../common/contracts/contracts.module';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';

@Module({
  imports: [ContractsModule],
  controllers: [PoolController],
  providers: [PoolService],
  exports: [PoolService],
})
export class PoolModule {}
