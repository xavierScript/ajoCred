import { Module } from '@nestjs/common';
import { CleanverseModule } from '../common/cleanverse/cleanverse.module';
import { FaucetController } from './faucet.controller';
import { FaucetService } from './faucet.service';

@Module({
  imports: [CleanverseModule],
  controllers: [FaucetController],
  providers: [FaucetService],
})
export class FaucetModule {}
