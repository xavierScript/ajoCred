import { Module } from '@nestjs/common';
import { CleanverseModule } from '../common/cleanverse/cleanverse.module';
import { ApassController } from './apass.controller';
import { ApassService } from './apass.service';

@Module({
  imports: [CleanverseModule],
  controllers: [ApassController],
  providers: [ApassService],
  exports: [ApassService],
})
export class ApassModule {}
