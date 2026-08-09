import { Module } from '@nestjs/common';
import { CleanverseModule } from '../common/cleanverse/cleanverse.module';
import { RampController } from './ramp.controller';
import { RampService } from './ramp.service';

@Module({
  imports: [CleanverseModule],
  controllers: [RampController],
  providers: [RampService],
})
export class RampModule {}
