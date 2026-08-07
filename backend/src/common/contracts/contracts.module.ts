import { Module } from '@nestjs/common';
import { ContractClientService } from './contract-client.service';

@Module({
  providers: [ContractClientService],
  exports: [ContractClientService],
})
export class ContractsModule {}
