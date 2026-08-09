import { Module } from '@nestjs/common';
import { CleanverseModule } from '../common/cleanverse/cleanverse.module';
import { WhitelistService } from './whitelist.service';
import { WhitelistController } from './whitelist.controller';
import { AdminGuard } from '../common/admin/admin.guard';

@Module({
  imports: [CleanverseModule],
  controllers: [WhitelistController],
  providers: [WhitelistService, AdminGuard],
  exports: [WhitelistService],
})
export class WhitelistModule {}
