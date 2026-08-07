import { Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { CleanverseClientService } from './cleanverse-client.service';

@Module({
  providers: [EncryptionService, CleanverseClientService],
  exports: [EncryptionService, CleanverseClientService],
})
export class CleanverseModule {}
