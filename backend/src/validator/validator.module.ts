import { Module } from '@nestjs/common';
import { CleanverseModule } from '../common/cleanverse/cleanverse.module';
import { ValidatorController } from './validator.controller';
import { ValidatorService } from './validator.service';

@Module({
  imports: [CleanverseModule],
  controllers: [ValidatorController],
  providers: [ValidatorService],
})
export class ValidatorModule {}
